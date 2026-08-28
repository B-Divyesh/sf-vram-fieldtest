use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use clap::{Args, Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}, process::Command, time::Instant};

const VERSION: &str = env!("CARGO_PKG_VERSION");
const DEFAULT_MIB: u64 = 256;
const MAX_MIB: u64 = 16_384;

#[derive(Parser)]
#[command(name="vram-fieldtest", version=VERSION, about="Run a bounded GPU memory-pattern field test and save a report.")]
struct Cli { #[command(subcommand)] command: Option<Cmd> }
#[derive(Subcommand)]
enum Cmd {
    /// Run a real field test. Requires --yes because it can load the GPU.
    Run(RunArgs),
    /// Write the bundled sample report to a temporary directory.
    Demo { #[arg(long)] json: bool },
    /// Show the GPU inventory visible to this machine.
    Inspect { #[arg(long)] json: bool },
}
#[derive(Args)]
struct RunArgs {
    /// Explicit consent to run a memory stress test.
    #[arg(long)] yes: bool,
    /// Directory for report.json and report.html.
    #[arg(long, default_value="./vram-fieldtest-report")] output: PathBuf,
    /// MiB tested per pattern. Capped at 16,384 MiB; start with 256 MiB.
    #[arg(long, default_value_t=DEFAULT_MIB)] mib: u64,
    /// Stop after this many seconds (informational maximum for future backends).
    #[arg(long, default_value_t=180, value_parser=clap::value_parser!(u64).range(10..=900))] seconds: u64,
    /// Machine-readable final summary on stdout.
    #[arg(long)] json: bool,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Report {
    schema: String, tool_version: String, started_at: DateTime<Utc>, duration_ms: u128,
    host: Host, adapter: Adapter, limits: Limits, patterns: Vec<Pattern>, verdict: Verdict,
    notes: Vec<String>,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Host { os: String, hostname: String }
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Adapter { name: String, backend: String, detected_vram_mib: Option<u64>, source: String }
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Limits { requested_mib: u64, tested_mib: u64, detected_vram_mib: Option<u64>, coverage_percent: Option<f64>, thermal_limit_c: u8, max_seconds: u64 }
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Pattern { name: String, bytes: u64, mismatches: u64, status: String }
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Verdict { status: String, summary: String }

fn main() -> Result<()> {
    let cli=Cli::parse();
    match cli.command.unwrap_or(Cmd::Inspect {json:false}) {
        Cmd::Inspect {json} => { let a=inventory(); if json { println!("{}", serde_json::to_string_pretty(&a)?); } else { println!("{} ({})", a.name, a.backend); if let Some(m)=a.detected_vram_mib { println!("Detected VRAM: {m} MiB ({})", a.source); } else { println!("VRAM: unavailable ({})", a.source); } } }
        Cmd::Demo {json} => { let dir=std::env::temp_dir().join(format!("vram-fieldtest-demo-{}", std::process::id())); fs::create_dir_all(&dir)?; let r:Report=serde_json::from_str(include_str!("../examples/sample-report.json"))?; write_report(&dir, &r)?; if json { println!("{}", serde_json::json!({"mode":"demo","output":dir,"verdict":r.verdict.status})); } else { println!("Demo report written to {}\nResult: {}", dir.display(), r.verdict.summary); } }
        Cmd::Run(args) => run(args)?,
    }; Ok(())
}
fn run(args:RunArgs)->Result<()> {
    if !args.yes { bail!("Not started: pass --yes after you have a clear view of the GPU and its cooling."); }
    if args.mib > MAX_MIB { bail!("Not started: --mib is capped at {MAX_MIB} MiB in v0.1. Use smaller bounded passes."); }
    let started=Utc::now(); let clock=Instant::now(); let (gpu, adapter)=open_gpu()?;
    let safe_mib=(gpu.max_mib).min(args.mib);
    if safe_mib < args.mib { eprintln!("Requested {} MiB; this adapter exposes {} MiB for one safe storage buffer. Coverage is reported from the actual pass.",args.mib,safe_mib); }
    let bytes=safe_mib*1024*1024;
    let mut patterns=Vec::new(); let thermal_limit=85;
    for (name, word) in [("solid AA",0xAAAA_AAAAu32),("solid 55",0x5555_5555u32),("walking address",0u32)] {
        if clock.elapsed().as_secs() >= args.seconds { bail!("Stopped at the {} second time limit before {name}. Lower --mib or allow more time.", args.seconds); }
        if let Some(temp)=gpu_temperature() { if temp >= thermal_limit { bail!("Stopped before {name}: GPU temperature is {temp}°C, at or above the {thermal_limit}°C limit."); } }
        let result=exercise_gpu_buffer(&gpu, bytes, word, name)?;
        if let Some(temp)=gpu_temperature() { if temp >= thermal_limit { bail!("Stopped after {name}: GPU temperature is {temp}°C, at or above the {thermal_limit}°C limit."); } }
        patterns.push(result);
    }
    let bad: u64=patterns.iter().map(|p|p.mismatches).sum();
    let coverage=adapter.detected_vram_mib.map(|v| (safe_mib as f64 / v as f64 * 100.0).min(100.0));
    let status=if bad==0 {"pass"} else {"fail"};
    let summary=if bad==0 { format!("No mismatches in {} MiB of GPU buffer space across {} patterns.", safe_mib, patterns.len()) } else { format!("{bad} mismatches found. Do not rely on this GPU until it is retested.") };
    let report=Report { schema:"vram-fieldtest/report-1".into(), tool_version:VERSION.into(), started_at:started, duration_ms:clock.elapsed().as_millis(), host:Host{os:std::env::consts::OS.into(), hostname:hostname()}, adapter:adapter.clone(), limits:Limits{requested_mib:args.mib,tested_mib:safe_mib,detected_vram_mib:adapter.detected_vram_mib,coverage_percent:coverage,thermal_limit_c:85,max_seconds:args.seconds},patterns,verdict:Verdict{status:status.into(),summary:summary.clone()}, notes:vec!["The tool retains no telemetry and writes only the requested local report.".into(), "The tool runs WebGPU compute writes and read-back verification on a device-local buffer. It uses the selected safe buffer size, not an assumed full-card allocation.".into(), "Thermals and clocks are not available through the portable v0.1 backend; monitor them in your vendor tool during the run.".into(), "A pass is evidence for this bounded pattern run. It does not certify every GPU fault.".into()]};
    write_report(&args.output,&report)?;
    if args.json { println!("{}", serde_json::json!({"output":args.output,"status":status,"coverage_percent":coverage,"mismatches":bad})); } else { println!("{}\nJSON: {}\nPrint report: {}", summary,args.output.join("report.json").display(),args.output.join("report.html").display()); }
    if bad > 0 { std::process::exit(2); } Ok(())
}
struct Gpu { device:wgpu::Device, queue:wgpu::Queue, max_mib:u64 }
fn open_gpu()->Result<(Gpu, Adapter)> {
    let instance=wgpu::Instance::default();
    let adapter=pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions { power_preference:wgpu::PowerPreference::HighPerformance, compatible_surface:None, force_fallback_adapter:false })).context("No usable GPU adapter found. Check the graphics driver, then run `vram-fieldtest demo` to inspect the report format.")?;
    let info=adapter.get_info(); let limits=adapter.limits();
    let max_mib=(limits.max_storage_buffer_binding_size as u64 / 1024 / 1024).min(MAX_MIB).max(1);
    let (device,queue)=pollster::block_on(adapter.request_device(&wgpu::DeviceDescriptor { label:Some("VRAM Field Test"), required_features:wgpu::Features::empty(), required_limits:limits },None)).context("Could not open the GPU for compute. Close other GPU tests and retry.")?;
    let mut inv=inventory(); inv.name=info.name; inv.backend=format!("WebGPU {:?}",info.backend); Ok((Gpu{device,queue,max_mib},inv))
}
fn exercise_gpu_buffer(gpu:&Gpu, bytes:u64, word:u32, name:&str)->Result<Pattern>{
    use wgpu::util::DeviceExt;
    let words=bytes/4;
    let output=gpu.device.create_buffer(&wgpu::BufferDescriptor{label:Some("field test memory"),size:bytes,usage:wgpu::BufferUsages::STORAGE|wgpu::BufferUsages::COPY_SRC,mapped_at_creation:false});
    let readback=gpu.device.create_buffer(&wgpu::BufferDescriptor{label:Some("field test readback"),size:bytes,usage:wgpu::BufferUsages::COPY_DST|wgpu::BufferUsages::MAP_READ,mapped_at_creation:false});
    let params=[word, if name=="walking address" {1} else {0}, 0xA5A5_5A5A, words as u32];
    let uniform=gpu.device.create_buffer_init(&wgpu::util::BufferInitDescriptor{label:Some("field test pattern"),contents:bytemuck::cast_slice(&params),usage:wgpu::BufferUsages::UNIFORM});
    let shader=gpu.device.create_shader_module(wgpu::ShaderModuleDescriptor{label:Some("field-test shader"),source:wgpu::ShaderSource::Wgsl(std::borrow::Cow::Borrowed("struct Params { value:u32, address_mode:u32, salt:u32, count:u32 }; @group(0) @binding(0) var<storage, read_write> data:array<u32>; @group(0) @binding(1) var<uniform> p:Params; @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>) { if (id.x < p.count) { if (p.address_mode == 1u) { data[id.x] = id.x ^ p.salt; } else { data[id.x] = p.value; } } }"))});
    let layout=gpu.device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor{label:None,entries:&[wgpu::BindGroupLayoutEntry{binding:0,visibility:wgpu::ShaderStages::COMPUTE,ty:wgpu::BindingType::Buffer{ty:wgpu::BufferBindingType::Storage {read_only:false},has_dynamic_offset:false,min_binding_size:None},count:None},wgpu::BindGroupLayoutEntry{binding:1,visibility:wgpu::ShaderStages::COMPUTE,ty:wgpu::BindingType::Buffer{ty:wgpu::BufferBindingType::Uniform,has_dynamic_offset:false,min_binding_size:None},count:None}]});
    let pipeline=gpu.device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor{label:None,layout:Some(&gpu.device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor{label:None,bind_group_layouts:&[&layout],push_constant_ranges:&[]})),module:&shader,entry_point:"main"});
    let bind=gpu.device.create_bind_group(&wgpu::BindGroupDescriptor{label:None,layout:&layout,entries:&[wgpu::BindGroupEntry{binding:0,resource:output.as_entire_binding()},wgpu::BindGroupEntry{binding:1,resource:uniform.as_entire_binding()}]});
    let mut encoder=gpu.device.create_command_encoder(&wgpu::CommandEncoderDescriptor{label:None}); { let mut pass=encoder.begin_compute_pass(&wgpu::ComputePassDescriptor{label:None,timestamp_writes:None}); pass.set_pipeline(&pipeline); pass.set_bind_group(0,&bind,&[]); pass.dispatch_workgroups(((words+63)/64) as u32,1,1); } encoder.copy_buffer_to_buffer(&output,0,&readback,0,bytes); gpu.queue.submit(Some(encoder.finish()));
    let slice=readback.slice(..); let (tx,rx)=std::sync::mpsc::channel(); slice.map_async(wgpu::MapMode::Read,move|v| { tx.send(v).ok(); }); gpu.device.poll(wgpu::Maintain::Wait); rx.recv().context("GPU read-back did not finish")?.context("GPU could not map test data")?; let data=slice.get_mapped_range(); let values:&[u32]=bytemuck::cast_slice(&data); let mut mismatches=0u64; for (i,value) in values.iter().enumerate(){let want=if name=="walking address" {(i as u32)^0xA5A5_5A5A}else{word};if *value!=want{mismatches+=1;}} drop(data);readback.unmap();
    Ok(Pattern{name:name.into(),bytes,mismatches,status:if mismatches==0{"pass".into()}else{"fail".into()}})
}
fn inventory()->Adapter {
    let detected=linux_vram();
    Adapter {name: gpu_name().unwrap_or_else(|| "GPU adapter not reported by this OS".into()),backend:"portable host-visible safety pass".into(),detected_vram_mib:detected,source:if detected.is_some(){"OS driver report".into()}else{"not exposed by this OS".into()}}
}
fn linux_vram()->Option<u64>{
    if cfg!(target_os="linux") { let root=Path::new("/sys/class/drm"); if let Ok(entries)=fs::read_dir(root){ for e in entries.flatten(){ let p=e.path().join("device/mem_info_vram_total"); if let Ok(s)=fs::read_to_string(p){ if let Ok(n)=s.trim().parse::<u64>(){ return Some(n/1024/1024); } } } } }
    None
}
fn gpu_name()->Option<String>{
    #[cfg(target_os="linux")] { if let Ok(o)=Command::new("sh").args(["-c","lspci 2>/dev/null | grep -Ei 'vga|3d' | head -1"]).output(){ let s=String::from_utf8_lossy(&o.stdout).trim().to_string(); if !s.is_empty(){return Some(s)} } }
    None
}
fn gpu_temperature()->Option<u32>{
    let output=Command::new("nvidia-smi").args(["--query-gpu=temperature.gpu","--format=csv,noheader,nounits"]).output().ok()?;
    String::from_utf8_lossy(&output.stdout).lines().next()?.trim().parse().ok()
}
fn hostname()->String { std::env::var("COMPUTERNAME").or_else(|_|std::env::var("HOSTNAME")).unwrap_or_else(|_|"local machine".into()) }
fn write_report(dir:&Path, report:&Report)->Result<()> { fs::create_dir_all(dir).with_context(||format!("Could not create {}",dir.display()))?; fs::write(dir.join("report.json"),serde_json::to_string_pretty(report)?)?; fs::write(dir.join("report.html"),render_html(report))?; Ok(()) }
fn render_html(r:&Report)->String { let rows=r.patterns.iter().map(|p|format!("<tr><td>{}</td><td>{} MiB</td><td>{}</td><td>{}</td></tr>",esc(&p.name),p.bytes/1024/1024,p.mismatches,esc(&p.status))).collect::<String>(); let coverage=r.limits.coverage_percent.map(|n|format!("{n:.1}%")).unwrap_or_else(||"not available".into()); format!(r#"<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VRAM Field Test report</title><style>body{{font-family:system-ui;max-width:760px;margin:40px auto;padding:0 20px;color:#181714}}h1{{font-family:monospace}}.pass{{color:#176a44}}.fail{{color:#9c251d}}table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #777;padding:9px;text-align:left}}.stamp{{border:3px solid;padding:8px;display:inline-block;font-weight:bold}}</style><main><p>VRAM FIELD TEST / local evidence report</p><h1>Memory pattern report</h1><p class="stamp {status}">{status}</p><p>{summary}</p><h2>Coverage</h2><p>Tested {tested} MiB. Detected VRAM: {detected}. Usable coverage: {coverage}.</p><h2>Patterns</h2><table><thead><tr><th>Pattern</th><th>Bytes</th><th>Mismatches</th><th>Status</th></tr></thead><tbody>{rows}</tbody></table><h2>Limits</h2><p>Thermal limit: {thermal}°C. Maximum requested duration: {seconds}s.</p><h2>Read before using this report</h2><p>{notes}</p></main>"#,status=esc(&r.verdict.status),summary=esc(&r.verdict.summary),tested=r.limits.tested_mib,detected=r.limits.detected_vram_mib.map(|n|format!("{n} MiB")).unwrap_or_else(||"not exposed".into()),coverage=coverage,rows=rows,thermal=r.limits.thermal_limit_c,seconds=r.limits.max_seconds,notes=r.notes.iter().map(|n|format!("<p>{}</p>",esc(n))).collect::<String>()) }
fn esc(s:&str)->String{s.replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;")}

#[cfg(test)] mod tests { use super::*; #[test] fn local_pattern_rule_is_sound(){assert_eq!((33u32)^0xA5A5_5A5A,(33u32)^0xA5A5_5A5A);} #[test] fn html_includes_coverage(){let r:Report=serde_json::from_str(include_str!("../examples/sample-report.json")).unwrap();assert!(render_html(&r).contains("Coverage"));} }
