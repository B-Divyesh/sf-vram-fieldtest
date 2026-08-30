use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use clap::{Args, Parser, Subcommand};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::mpsc,
    time::{Duration, Instant},
};

const VERSION: &str = env!("CARGO_PKG_VERSION");
const DEFAULT_COVERAGE: u8 = 90;
const DEFAULT_WINDOW_MIB: u64 = 1024;
const MAX_CHUNK_MIB: u64 = 64;
const MAX_WINDOW_MIB: u64 = 16_384;
const MIB: u64 = 1024 * 1024;

#[derive(Parser)]
#[command(name="vram-fieldtest", version=VERSION, about="Run a bounded, windowed GPU memory-pattern field test and save a report.")]
struct Cli {
    #[command(subcommand)]
    command: Option<Cmd>,
}
#[derive(Subcommand)]
enum Cmd {
    /// Run a real field test. Requires --yes because it can load the GPU.
    Run(RunArgs),
    /// Preview a requested memory amount without opening a GPU.
    Plan(PlanArgs),
    /// Write the bundled sample report to a temporary directory.
    Demo {
        #[arg(long)]
        json: bool,
    },
    /// Show the GPU inventory visible to this machine.
    Inspect {
        #[arg(long)]
        json: bool,
    },
}
#[derive(Args)]
struct RunArgs {
    #[arg(long)]
    yes: bool,
    /// Adapter index shown by `vram-fieldtest inspect`.
    #[arg(long, default_value_t = 0)]
    adapter: usize,
    /// Permit a software adapter. Intended for release protocol checks, not hardware reports.
    #[arg(long, hide = true)]
    allow_software: bool,
    /// UNSAFE: run without an automatic temperature stop when selected-adapter telemetry is unavailable.
    #[arg(long)]
    allow_no_thermal_stop: bool,
    #[arg(long, default_value = "./vram-fieldtest-report")]
    output: PathBuf,
    /// Total MiB to test across windows. If omitted, derive a request from VRAM reported on this host.
    #[arg(long, value_parser = clap::value_parser!(u64).range(1..=1_048_576))]
    mib: Option<u64>,
    /// Percent of host-reported VRAM to request when --mib is not supplied.
    #[arg(long, default_value_t = DEFAULT_COVERAGE, value_parser = clap::value_parser!(u8).range(1..=100))]
    coverage: u8,
    /// Largest monitored test batch in MiB. Distinct allocations stay live across batches.
    #[arg(long, default_value_t = DEFAULT_WINDOW_MIB, value_parser = clap::value_parser!(u64).range(1..=MAX_WINDOW_MIB))]
    window_mib: u64,
    /// Stop safely at this total duration, including an in-progress pattern.
    #[arg(long, default_value_t = 180, value_parser = clap::value_parser!(u64).range(10..=900))]
    seconds: u64,
    #[arg(long)]
    json: bool,
}
#[derive(Args)]
struct PlanArgs {
    /// Host-reported VRAM value to model in MiB when previewing a request.
    #[arg(long, value_parser = clap::value_parser!(u64).range(1..=1_048_576))]
    detected_mib: u64,
    #[arg(long, default_value_t = DEFAULT_COVERAGE, value_parser = clap::value_parser!(u8).range(1..=100))]
    coverage: u8,
    #[arg(long, default_value_t = DEFAULT_WINDOW_MIB, value_parser = clap::value_parser!(u64).range(1..=MAX_WINDOW_MIB))]
    window_mib: u64,
    #[arg(long)]
    json: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Report {
    schema: String,
    tool_version: String,
    started_at: DateTime<Utc>,
    duration_ms: u128,
    host: Host,
    adapter: Adapter,
    limits: Limits,
    #[serde(default)]
    residency: ResidencyEvidence,
    patterns: Vec<Pattern>,
    #[serde(default)]
    telemetry: Telemetry,
    verdict: Verdict,
    notes: Vec<String>,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Host {
    os: String,
    hostname: String,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Adapter {
    #[serde(default)]
    index: usize,
    name: String,
    backend: String,
    #[serde(default)]
    device_type: String,
    #[serde(default)]
    vendor_id: u32,
    #[serde(default)]
    device_id: u32,
    detected_vram_mib: Option<u64>,
    source: String,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Limits {
    requested_mib: u64,
    tested_mib: u64,
    detected_vram_mib: Option<u64>,
    coverage_percent: Option<f64>,
    #[serde(default)]
    coverage_target_percent: Option<u8>,
    #[serde(default)]
    window_mib: u64,
    #[serde(default)]
    chunk_mib: u64,
    #[serde(default)]
    resident_mib: u64,
    #[serde(default)]
    resident_allocations: u64,
    thermal_limit_c: Option<u8>,
    max_seconds: u64,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Pattern {
    name: String,
    bytes: u64,
    mismatches: u64,
    status: String,
    #[serde(default)]
    windows: u32,
}
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct ResidencyEvidence {
    strategy: String,
    allocated_bytes: u64,
    allocation_count: u64,
    retained_through_patterns: bool,
}
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct Telemetry {
    provider: String,
    samples: Vec<TelemetrySample>,
    unavailable_reason: Option<String>,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
struct TelemetrySample {
    at_ms: u128,
    phase: String,
    temperature_c: Option<f64>,
    core_clock_mhz: Option<f64>,
    memory_clock_mhz: Option<f64>,
}
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Verdict {
    status: String,
    summary: String,
}
#[derive(Serialize, Debug)]
struct CoveragePlan {
    detected_mib: u64,
    requested_mib: u64,
    requested_percent: f64,
    window_mib: u64,
    windows: u64,
}

fn main() -> Result<()> {
    match Cli::parse().command.unwrap_or(Cmd::Inspect { json: false }) {
        Cmd::Inspect { json } => print_inventory(json),
        Cmd::Plan(args) => print_plan(args),
        Cmd::Demo { json } => demo(json)?,
        Cmd::Run(args) => run(args)?,
    };
    Ok(())
}
fn print_inventory(json: bool) {
    let adapters: Vec<Adapter> = enumerate_gpu_candidates()
        .into_iter()
        .map(|candidate| candidate.report)
        .collect();
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&adapters).expect("inventory serializes")
        );
    } else if adapters.is_empty() {
        println!("No GPU adapter is available. Check the graphics driver, then try again.");
    } else {
        for adapter in adapters {
            println!("[{}] {} ({})", adapter.index, adapter.name, adapter.backend);
            match adapter.detected_vram_mib {
                Some(m) => println!("    Reported GPU memory: {m} MiB ({})", adapter.source),
                None => println!("    GPU memory: unavailable ({})", adapter.source),
            }
        }
    }
}
fn print_plan(args: PlanArgs) {
    let plan = coverage_plan(args.detected_mib, None, args.coverage, args.window_mib);
    if args.json {
        println!(
            "{}",
            serde_json::to_string_pretty(&plan).expect("plan serializes")
        );
    } else {
        println!(
            "{} MiB across {} windows: {:.1}% requested from {} MiB",
            plan.requested_mib, plan.windows, plan.requested_percent, plan.detected_mib
        );
    }
}
fn demo(json: bool) -> Result<()> {
    let dir = std::env::temp_dir().join(format!("vram-fieldtest-demo-{}", std::process::id()));
    fs::create_dir_all(&dir)?;
    let r: Report = serde_json::from_str(include_str!("../examples/sample-report.json"))?;
    write_report(&dir, &r)?;
    if json {
        println!(
            "{}",
            serde_json::json!({"mode":"demo","output":dir,"verdict":r.verdict.status})
        );
    } else {
        println!(
            "Demo report written to {}\nResult: {}",
            dir.display(),
            r.verdict.summary
        );
    }
    Ok(())
}
fn coverage_plan(
    detected_mib: u64,
    requested: Option<u64>,
    coverage: u8,
    window_mib: u64,
) -> CoveragePlan {
    let target = requested.unwrap_or_else(|| {
        detected_mib
            .saturating_mul(u64::from(coverage))
            .div_ceil(100)
    });
    let requested_mib = target.min(detected_mib);
    CoveragePlan {
        detected_mib,
        requested_mib,
        requested_percent: requested_mib as f64 / detected_mib as f64 * 100.0,
        window_mib,
        windows: requested_mib.div_ceil(window_mib),
    }
}

fn resolve_requested_mib(
    detected_mib: Option<u64>,
    requested_mib: Option<u64>,
    coverage: u8,
    window_mib: u64,
) -> Result<(Option<CoveragePlan>, u64)> {
    match detected_mib {
        Some(detected) => {
            let plan = coverage_plan(detected, requested_mib, coverage, window_mib);
            let requested = plan.requested_mib;
            Ok((Some(plan), requested))
        }
        None => requested_mib.map_or_else(
            || {
                bail!("the driver did not report GPU memory. Run `vram-fieldtest inspect`, confirm the card's memory, then pass `--mib <amount>`")
            },
            |requested| Ok((None, requested)),
        ),
    }
}

fn completed_tested_mib(patterns: &[Pattern]) -> u64 {
    if patterns.len() == 3 {
        patterns
            .iter()
            .map(|pattern| pattern.bytes / MIB)
            .min()
            .unwrap_or(0)
    } else {
        0
    }
}

/// A coverage percentage is a result, not a request. It is meaningful only
/// after all three patterns finished successfully in the report being saved.
fn completed_run_coverage(
    detected_vram_mib: Option<u64>,
    patterns: &[Pattern],
    status: &str,
) -> Option<f64> {
    if status != "pass"
        || patterns.len() != 3
        || patterns.iter().any(|pattern| pattern.status != "pass")
    {
        return None;
    }
    let tested_mib = completed_tested_mib(patterns);
    (tested_mib > 0).then_some(())?;
    detected_vram_mib.map(|detected| (tested_mib as f64 / detected as f64 * 100.0).min(100.0))
}

fn run(args: RunArgs) -> Result<()> {
    if !args.yes {
        bail!("Not started: pass --yes after you have a clear view of the GPU and its cooling.");
    }
    let started = Utc::now();
    let clock = Instant::now();
    let deadline = clock + Duration::from_secs(args.seconds);
    let (gpu, adapter) = open_gpu(args.adapter, args.allow_software)?;
    let (_plan, requested_mib) = resolve_requested_mib(
        adapter.detected_vram_mib,
        args.mib,
        args.coverage,
        args.window_mib,
    )
    .with_context(|| format!("Not started for adapter {}", adapter.index))?;
    let chunk_mib = gpu.max_chunk_mib.min(args.window_mib).max(1);
    if chunk_mib < args.window_mib {
        eprintln!("This adapter uses {chunk_mib} MiB resident allocations inside each test batch.");
    }
    let mut telemetry = telemetry_snapshot(clock.elapsed().as_millis(), "before run", &adapter);
    let thermal_limit =
        thermal_limit_for_run(&telemetry, args.allow_no_thermal_stop, args.allow_software)?;
    if thermal_limit.is_none() && !args.allow_software {
        eprintln!(
            "WARNING: no automatic thermal stop is active. Keep the selected GPU in view and stop the run if cooling or stability changes."
        );
    }
    let mut patterns = Vec::new();
    let mut stop_reason = thermal_limit.and_then(|limit| thermal_stop(&telemetry, limit));
    if let Some(reason) = &stop_reason {
        bail!("Not started: {reason}");
    }
    let mut allocation_control = ExerciseControl {
        deadline,
        telemetry: &mut telemetry,
        clock: &clock,
        thermal_limit,
        adapter: &adapter,
    };
    let residency = allocate_resident_set(
        &gpu,
        requested_mib * MIB,
        chunk_mib * MIB,
        args.window_mib * MIB,
        &mut allocation_control,
    )?;
    stop_reason = residency.stop_reason.clone();
    if !residency.complete {
        stop_reason.get_or_insert_with(|| {
            "The requested distinct GPU memory could not be allocated.".into()
        });
    }
    for (name, word) in [
        ("solid AA", 0xAAAA_AAAAu32),
        ("solid 55", 0x5555_5555u32),
        ("address XOR", 0u32),
    ] {
        if stop_reason.is_some() || Instant::now() >= deadline {
            break;
        }
        let mut control = ExerciseControl {
            deadline,
            telemetry: &mut telemetry,
            clock: &clock,
            thermal_limit,
            adapter: &adapter,
        };
        let outcome =
            exercise_pattern(&gpu, &residency, args.window_mib, word, name, &mut control)?;
        if outcome.status == "fail" {
            patterns.push(outcome);
            break;
        }
        if outcome.status != "pass" {
            stop_reason = Some(format!("Stopped safely during {name}: {}", outcome.status));
        }
        patterns.push(outcome);
    }
    if stop_reason.is_none() && patterns.len() < 3 {
        stop_reason = Some(format!(
            "Stopped safely at the {} second time limit.",
            args.seconds
        ));
    }
    let tested_mib = completed_tested_mib(&patterns);
    let bad: u64 = patterns.iter().map(|p| p.mismatches).sum();
    let final_sample = telemetry_sample(clock.elapsed().as_millis(), "after run", &adapter);
    if stop_reason.is_none() {
        if let Some(limit) = thermal_limit {
            stop_reason = thermal_stop_sample(&final_sample, limit);
        }
    }
    telemetry.samples.push(final_sample);
    let status = if bad > 0 {
        "fail"
    } else if stop_reason.is_some() {
        "incomplete"
    } else {
        "pass"
    };
    let coverage = completed_run_coverage(adapter.detected_vram_mib, &patterns, status);
    let summary = match status {
        "pass" => format!(
            "No mismatches in {tested_mib} MiB across {} patterns and {} retained allocation(s).",
            patterns.len(),
            residency.allocations.len()
        ),
        "incomplete" => format!(
            "{} {} MiB was verified before the stop.",
            stop_reason.as_deref().unwrap_or("Stopped safely."),
            tested_mib
        ),
        _ => format!("{bad} mismatches found. Do not rely on this GPU until it is retested."),
    };
    let mut notes = vec!["The tool retains no telemetry and writes only the requested local report.".into(), "A coverage value is calculated only from all three completed patterns in this report on this host.".into(), "Each allocation is at most 64 MiB so duration and thermal guards can stop between GPU submissions and during CPU verification.".into(), "A pass is evidence for this bounded pattern run. It does not certify every GPU fault.".into()];
    if coverage.is_none() {
        notes.push(
            "No coverage value is reported because this run did not complete all three patterns."
                .into(),
        );
    }
    if thermal_limit.is_none() {
        notes.push("No automatic thermal stop was active. This run used an explicit unsafe override or a software adapter.".into());
    }
    let report = Report {
        schema: "vram-fieldtest/report-1".into(),
        tool_version: VERSION.into(),
        started_at: started,
        duration_ms: clock.elapsed().as_millis(),
        host: Host {
            os: std::env::consts::OS.into(),
            hostname: hostname(),
        },
        adapter: adapter.clone(),
        limits: Limits {
            requested_mib,
            tested_mib,
            detected_vram_mib: adapter.detected_vram_mib,
            coverage_percent: coverage,
            coverage_target_percent: coverage.map(|_| args.coverage),
            window_mib: args.window_mib,
            chunk_mib,
            resident_mib: residency.bytes / MIB,
            resident_allocations: residency.allocations.len() as u64,
            thermal_limit_c: thermal_limit,
            max_seconds: args.seconds,
        },
        residency: ResidencyEvidence {
            strategy: "distinct live WebGPU allocations".into(),
            allocated_bytes: residency.bytes,
            allocation_count: residency.allocations.len() as u64,
            retained_through_patterns: residency.complete,
        },
        patterns,
        telemetry,
        verdict: Verdict {
            status: status.into(),
            summary: summary.clone(),
        },
        notes,
    };
    let exit_code = save_report_and_exit_code(&args.output, &report)?;
    if args.json {
        println!(
            "{}",
            serde_json::json!({"output":args.output,"status":status,"coverage_percent":coverage,"mismatches":bad,"tested_mib":tested_mib,"resident_mib":residency.bytes / MIB,"resident_allocations":residency.allocations.len(),"retention":"all allocations kept live through the pattern run"})
        );
    } else {
        println!(
            "{}\nJSON: {}\nPrint report: {}",
            summary,
            args.output.join("report.json").display(),
            args.output.join("report.html").display()
        );
    }
    if exit_code == 1 {
        bail!(
            "{} Report saved before exit.",
            stop_reason.unwrap_or_else(|| "Stopped safely.".into())
        );
    }
    if exit_code == 2 {
        std::process::exit(2);
    }
    Ok(())
}

struct ExerciseControl<'a> {
    deadline: Instant,
    telemetry: &'a mut Telemetry,
    clock: &'a Instant,
    thermal_limit: Option<u8>,
    adapter: &'a Adapter,
}

fn exercise_pattern(
    gpu: &Gpu,
    residency: &ResidentSet,
    window_mib: u64,
    word: u32,
    name: &str,
    control: &mut ExerciseControl<'_>,
) -> Result<Pattern> {
    let mut tested = 0u64;
    let mut mismatches = 0u64;
    let mut windows = 0u32;
    let window_bytes = window_mib * MIB;
    for allocation in &residency.allocations {
        if Instant::now() >= control.deadline {
            return Ok(Pattern {
                name: name.into(),
                bytes: tested,
                mismatches,
                status: "time limit".into(),
                windows,
            });
        }
        if tested.is_multiple_of(window_bytes) {
            let pre = telemetry_sample(
                control.clock.elapsed().as_millis(),
                format!("before {name} batch {}", windows + 1),
                control.adapter,
            );
            if control
                .thermal_limit
                .is_some_and(|limit| thermal_stop_sample(&pre, limit).is_some())
            {
                control.telemetry.samples.push(pre);
                return Ok(Pattern {
                    name: name.into(),
                    bytes: tested,
                    mismatches,
                    status: telemetry_stop_status(
                        control
                            .telemetry
                            .samples
                            .last()
                            .expect("sample was recorded"),
                        control.thermal_limit.expect("guarded thermal limit"),
                    )
                    .into(),
                    windows,
                });
            }
            control.telemetry.samples.push(pre);
        }
        let result = exercise_gpu_allocation(gpu, allocation, word, name, control.deadline)?;
        tested += result.bytes;
        mismatches += result.mismatches;
        if !result.complete {
            return Ok(Pattern {
                name: name.into(),
                bytes: tested,
                mismatches,
                status: "time limit".into(),
                windows: tested.div_ceil(window_bytes) as u32,
            });
        }
        if tested.is_multiple_of(window_bytes) || tested == residency.bytes {
            windows += 1;
            let post = telemetry_sample(
                control.clock.elapsed().as_millis(),
                format!("after {name} batch {windows}"),
                control.adapter,
            );
            let stop_status = control
                .thermal_limit
                .and_then(|limit| thermal_stop_sample(&post, limit))
                .map(|_| {
                    telemetry_stop_status(
                        &post,
                        control.thermal_limit.expect("guarded thermal limit"),
                    )
                });
            control.telemetry.samples.push(post);
            if let Some(stop_status) = stop_status {
                return Ok(Pattern {
                    name: name.into(),
                    bytes: tested,
                    mismatches,
                    status: stop_status.into(),
                    windows,
                });
            }
        }
    }
    Ok(Pattern {
        name: name.into(),
        bytes: tested,
        mismatches,
        status: if mismatches == 0 {
            "pass".into()
        } else {
            "fail".into()
        },
        windows,
    })
}
struct ChunkResult {
    bytes: u64,
    mismatches: u64,
    complete: bool,
}
struct Gpu {
    device: wgpu::Device,
    queue: wgpu::Queue,
    max_chunk_mib: u64,
    max_workgroups: u32,
}
struct GpuCandidate {
    handle: wgpu::Adapter,
    report: Adapter,
}
#[derive(Debug)]
struct AllocationSpec {
    ordinal: u64,
    offset_bytes: u64,
    bytes: u64,
}
struct ResidentAllocation {
    buffer: wgpu::Buffer,
    spec: AllocationSpec,
}
struct ResidentSet {
    allocations: Vec<ResidentAllocation>,
    bytes: u64,
    complete: bool,
    stop_reason: Option<String>,
}

fn open_gpu(index: usize, allow_software: bool) -> Result<(Gpu, Adapter)> {
    let instance = wgpu::Instance::default();
    let mut candidates = candidates_for_instance(&instance);
    if candidates.is_empty() && allow_software {
        if let Some(handle) =
            pollster::block_on(instance.request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::LowPower,
                compatible_surface: None,
                force_fallback_adapter: true,
            }))
        {
            let info = handle.get_info();
            candidates.push(GpuCandidate {
                report: adapter_report(0, &info, &os_memory_adapters()),
                handle,
            });
        }
    }
    let selected = candidates.into_iter().find(|candidate| candidate.report.index == index).with_context(|| format!("Adapter {index} is not available. Run `vram-fieldtest inspect` and choose a listed adapter."))?;
    if !allow_software && selected.report.device_type == "software" {
        bail!("Adapter {index} is a software renderer, not GPU memory. Choose a hardware adapter shown by `vram-fieldtest inspect`.");
    }
    let adapter = selected.handle;
    let limits = adapter.limits();
    let max_chunk_mib =
        (u64::from(limits.max_storage_buffer_binding_size) / MIB).clamp(1, MAX_CHUNK_MIB);
    let max_workgroups = limits.max_compute_workgroups_per_dimension;
    let (device, queue) = pollster::block_on(adapter.request_device(
        &wgpu::DeviceDescriptor {
            label: Some("VRAM Field Test"),
            required_features: wgpu::Features::empty(),
            required_limits: limits,
        },
        None,
    ))
    .context("Could not open the GPU for compute. Close other GPU tests and retry.")?;
    Ok((
        Gpu {
            device,
            queue,
            max_chunk_mib,
            max_workgroups,
        },
        selected.report,
    ))
}

fn allocation_specs(target_bytes: u64, chunk_bytes: u64, window_bytes: u64) -> Vec<AllocationSpec> {
    let mut specs = Vec::new();
    let mut offset = 0;
    while offset < target_bytes {
        let remaining_in_window = window_bytes - offset % window_bytes;
        let bytes = (target_bytes - offset)
            .min(chunk_bytes)
            .min(remaining_in_window);
        specs.push(AllocationSpec {
            ordinal: specs.len() as u64,
            offset_bytes: offset,
            bytes,
        });
        offset += bytes;
    }
    specs
}

fn allocate_resident_set(
    gpu: &Gpu,
    target_bytes: u64,
    chunk_bytes: u64,
    window_bytes: u64,
    control: &mut ExerciseControl<'_>,
) -> Result<ResidentSet> {
    let specs = allocation_specs(target_bytes, chunk_bytes, window_bytes);
    let mut allocations = Vec::with_capacity(specs.len());
    let mut bytes = 0u64;
    let mut stop_reason = None;
    for spec in specs {
        if Instant::now() >= control.deadline {
            stop_reason =
                Some("The time limit was reached while reserving distinct GPU memory.".into());
            break;
        }
        if bytes.is_multiple_of(window_bytes) {
            let sample = telemetry_sample(
                control.clock.elapsed().as_millis(),
                format!("before allocation batch {}", bytes / window_bytes + 1),
                control.adapter,
            );
            let thermal_stop = control
                .thermal_limit
                .and_then(|limit| thermal_stop_sample(&sample, limit));
            control.telemetry.samples.push(sample);
            if thermal_stop.is_some() {
                stop_reason = thermal_stop;
                break;
            }
        }
        gpu.device.push_error_scope(wgpu::ErrorFilter::OutOfMemory);
        let label = format!("field test resident allocation {}", spec.ordinal);
        let buffer = gpu.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some(&label),
            size: spec.bytes,
            usage: wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = gpu
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
        encoder.clear_buffer(&buffer, 0, None);
        gpu.queue.submit(Some(encoder.finish()));
        gpu.device.poll(wgpu::Maintain::Wait);
        if let Some(error) = pollster::block_on(gpu.device.pop_error_scope()) {
            stop_reason = Some(format!(
                "The driver could reserve only {} MiB as distinct live GPU memory: {error}. Close GPU applications or pass a smaller --mib amount.",
                bytes / MIB
            ));
            break;
        }
        bytes += spec.bytes;
        allocations.push(ResidentAllocation { buffer, spec });
    }
    Ok(ResidentSet {
        complete: bytes == target_bytes,
        allocations,
        bytes,
        stop_reason,
    })
}

fn exercise_gpu_allocation(
    gpu: &Gpu,
    allocation: &ResidentAllocation,
    word: u32,
    name: &str,
    deadline: Instant,
) -> Result<ChunkResult> {
    use wgpu::util::DeviceExt;
    if Instant::now() >= deadline {
        return Ok(ChunkResult {
            bytes: 0,
            mismatches: 0,
            complete: false,
        });
    }
    let bytes = allocation.spec.bytes;
    let words = bytes / 4;
    let readback = gpu.device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("field test readback window"),
        size: bytes,
        usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
        mapped_at_creation: false,
    });
    let salt = 0xA5A5_5A5Au32 ^ (allocation.spec.ordinal as u32).wrapping_mul(0x9E37_79B9);
    let total_workgroups = words.div_ceil(64);
    let dispatch_width = total_workgroups.min(u64::from(gpu.max_workgroups)) as u32;
    let dispatch_height = total_workgroups.div_ceil(u64::from(dispatch_width)) as u32;
    let params = [
        word,
        u32::from(name == "address XOR"),
        salt,
        words as u32,
        (allocation.spec.offset_bytes / 4) as u32,
        dispatch_width,
        0,
        0,
    ];
    let uniform = gpu
        .device
        .create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("field test pattern"),
            contents: bytemuck::cast_slice(&params),
            usage: wgpu::BufferUsages::UNIFORM,
        });
    let shader = gpu.device.create_shader_module(wgpu::ShaderModuleDescriptor { label: Some("field-test shader"), source: wgpu::ShaderSource::Wgsl(std::borrow::Cow::Borrowed("struct Params { value:u32, address_mode:u32, salt:u32, count:u32, base_word:u32, dispatch_width:u32, pad0:u32, pad1:u32 }; @group(0) @binding(0) var<storage, read_write> data:array<u32>; @group(0) @binding(1) var<uniform> p:Params; @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) id:vec3<u32>, @builtin(workgroup_id) group:vec3<u32>, @builtin(local_invocation_index) local:u32) { let index = (group.y * p.dispatch_width + group.x) * 64u + local; if (index < p.count) { if (p.address_mode == 1u) { data[index] = (p.base_word + index) ^ p.salt; } else { data[index] = p.value; } } }")) });
    let layout = gpu
        .device
        .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: None,
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Storage { read_only: false },
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::COMPUTE,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
            ],
        });
    let pipeline = gpu
        .device
        .create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: None,
            layout: Some(
                &gpu.device
                    .create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
                        label: None,
                        bind_group_layouts: &[&layout],
                        push_constant_ranges: &[],
                    }),
            ),
            module: &shader,
            entry_point: "main",
        });
    let bind = gpu.device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: None,
        layout: &layout,
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: allocation.buffer.as_entire_binding(),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: uniform.as_entire_binding(),
            },
        ],
    });
    let mut encoder = gpu
        .device
        .create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
    {
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: None,
            timestamp_writes: None,
        });
        pass.set_pipeline(&pipeline);
        pass.set_bind_group(0, &bind, &[]);
        pass.dispatch_workgroups(dispatch_width, dispatch_height, 1);
    }
    encoder.copy_buffer_to_buffer(&allocation.buffer, 0, &readback, 0, bytes);
    gpu.queue.submit(Some(encoder.finish()));
    let slice = readback.slice(..);
    let (tx, rx) = mpsc::channel();
    slice.map_async(wgpu::MapMode::Read, move |v| {
        let _ = tx.send(v);
    });
    loop {
        gpu.device.poll(wgpu::Maintain::Poll);
        match rx.recv_timeout(Duration::from_millis(25)) {
            Ok(result) => {
                result.context("GPU could not map test data")?;
                break;
            }
            Err(mpsc::RecvTimeoutError::Timeout) if Instant::now() >= deadline => {
                return Ok(ChunkResult {
                    bytes: 0,
                    mismatches: 0,
                    complete: false,
                })
            }
            Err(mpsc::RecvTimeoutError::Timeout) => continue,
            Err(mpsc::RecvTimeoutError::Disconnected) => bail!("GPU read-back did not finish"),
        }
    }
    let data = slice.get_mapped_range();
    let values: &[u32] = bytemuck::cast_slice(&data);
    let mut mismatches = 0u64;
    for (i, value) in values.iter().enumerate() {
        if i % 262_144 == 0 && Instant::now() >= deadline {
            drop(data);
            readback.unmap();
            return Ok(ChunkResult {
                bytes: 0,
                mismatches,
                complete: false,
            });
        }
        let want = if name == "address XOR" {
            ((allocation.spec.offset_bytes / 4) as u32).wrapping_add(i as u32) ^ salt
        } else {
            word
        };
        if *value != want {
            mismatches += 1;
        }
    }
    drop(data);
    readback.unmap();
    Ok(ChunkResult {
        bytes,
        mismatches,
        complete: true,
    })
}
fn report_exit_code(report: &Report) -> i32 {
    if report.patterns.iter().any(|pattern| pattern.mismatches > 0) {
        2
    } else if report.verdict.status == "incomplete" {
        1
    } else {
        0
    }
}

fn save_report_and_exit_code(output: &Path, report: &Report) -> Result<i32> {
    write_report(output, report)?;
    Ok(report_exit_code(report))
}

fn thermal_limit_for_run(
    telemetry: &Telemetry,
    allow_no_thermal_stop: bool,
    allow_software: bool,
) -> Result<Option<u8>> {
    if telemetry
        .samples
        .last()
        .is_some_and(|sample| sample.temperature_c.is_some())
    {
        return Ok(Some(85));
    }
    if allow_no_thermal_stop || allow_software {
        return Ok(None);
    }
    bail!("Not started: temperature telemetry for the selected adapter is unavailable, so the 85°C automatic stop cannot be enforced. Fix the local GPU telemetry provider or, only if you accept manual monitoring, pass --allow-no-thermal-stop.")
}

fn thermal_stop(telemetry: &Telemetry, thermal_limit: u8) -> Option<String> {
    telemetry
        .samples
        .last()
        .and_then(|sample| thermal_stop_sample(sample, thermal_limit))
}

fn thermal_stop_sample(sample: &TelemetrySample, thermal_limit: u8) -> Option<String> {
    match sample.temperature_c {
        Some(temperature) if temperature >= f64::from(thermal_limit) => Some(format!(
            "Stopped safely: selected GPU temperature is {temperature:.1}°C, at or above the {thermal_limit}°C limit."
        )),
        None => Some("Stopped safely because selected-adapter temperature telemetry became unavailable; the automatic thermal stop can no longer be enforced.".into()),
        Some(_) => None,
    }
}

fn telemetry_stop_status(sample: &TelemetrySample, thermal_limit: u8) -> &'static str {
    if sample
        .temperature_c
        .is_some_and(|value| value >= f64::from(thermal_limit))
    {
        "thermal limit"
    } else {
        "temperature telemetry unavailable"
    }
}

#[derive(Debug, Clone)]
struct TelemetryReading {
    provider: String,
    temperature_c: Option<f64>,
    core_clock_mhz: Option<f64>,
    memory_clock_mhz: Option<f64>,
}

fn telemetry_snapshot(at_ms: u128, phase: &str, adapter: &Adapter) -> Telemetry {
    let reading = local_telemetry(adapter);
    let sample = TelemetrySample {
        at_ms,
        phase: phase.into(),
        temperature_c: reading.as_ref().and_then(|value| value.temperature_c),
        core_clock_mhz: reading.as_ref().and_then(|value| value.core_clock_mhz),
        memory_clock_mhz: reading.as_ref().and_then(|value| value.memory_clock_mhz),
    };
    Telemetry {
        provider: reading
            .as_ref()
            .map(|value| value.provider.clone())
            .unwrap_or_else(|| "not available for selected adapter".into()),
        samples: vec![sample],
        unavailable_reason: reading.is_none().then(|| {
            "No unambiguous local temperature provider matched the selected adapter.".into()
        }),
    }
}

fn telemetry_sample(at_ms: u128, phase: impl Into<String>, adapter: &Adapter) -> TelemetrySample {
    let reading = local_telemetry(adapter);
    TelemetrySample {
        at_ms,
        phase: phase.into(),
        temperature_c: reading.as_ref().and_then(|value| value.temperature_c),
        core_clock_mhz: reading.as_ref().and_then(|value| value.core_clock_mhz),
        memory_clock_mhz: reading.as_ref().and_then(|value| value.memory_clock_mhz),
    }
}

fn local_telemetry(adapter: &Adapter) -> Option<TelemetryReading> {
    if adapter.vendor_id == 0x10de {
        if let Some(text) = command_text(
            "nvidia-smi",
            &[
                "--query-gpu=name,pci.device_id,temperature.gpu,clocks.sm,clocks.mem",
                "--format=csv,noheader,nounits",
            ],
        ) {
            if let Some(reading) = select_nvidia_telemetry(&text, adapter) {
                return Some(reading);
            }
        }
    }
    #[cfg(target_os = "linux")]
    if let Some(reading) = drm_sysfs_telemetry(Path::new("/sys/class/drm"), adapter) {
        return Some(reading);
    }
    None
}

fn command_text(command: &str, args: &[&str]) -> Option<String> {
    Command::new(command)
        .args(args)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
}

#[derive(Debug, Clone)]
struct NvidiaTelemetryRow {
    name: String,
    device_id: Option<u32>,
    temperature_c: Option<f64>,
    core_clock_mhz: Option<f64>,
    memory_clock_mhz: Option<f64>,
}

fn parse_nvidia_telemetry(text: &str) -> Vec<NvidiaTelemetryRow> {
    text.lines()
        .filter_map(|line| {
            let fields: Vec<_> = line.split(',').map(str::trim).collect();
            Some(NvidiaTelemetryRow {
                name: fields.first()?.to_string(),
                device_id: fields
                    .get(1)
                    .and_then(|value| parse_nvidia_device_id(value)),
                temperature_c: fields.get(2).and_then(|value| value.parse().ok()),
                core_clock_mhz: fields.get(3).and_then(|value| value.parse().ok()),
                memory_clock_mhz: fields.get(4).and_then(|value| value.parse().ok()),
            })
        })
        .collect()
}

fn parse_nvidia_device_id(value: &str) -> Option<u32> {
    let raw = u32::from_str_radix(value.trim_start_matches("0x"), 16).ok()?;
    Some(if raw > 0xffff { raw >> 16 } else { raw })
}

fn select_nvidia_telemetry(text: &str, adapter: &Adapter) -> Option<TelemetryReading> {
    let rows = parse_nvidia_telemetry(text);
    let matches: Vec<_> = rows
        .iter()
        .filter(|row| {
            (adapter.device_id != 0 && row.device_id == Some(adapter.device_id))
                || normalize_adapter_name(&row.name) == normalize_adapter_name(&adapter.name)
        })
        .collect();
    let [selected] = matches.as_slice() else {
        return None;
    };
    selected.temperature_c?;
    Some(TelemetryReading {
        provider: format!("nvidia-smi selected adapter {}", adapter.index),
        temperature_c: selected.temperature_c,
        core_clock_mhz: selected.core_clock_mhz,
        memory_clock_mhz: selected.memory_clock_mhz,
    })
}

#[cfg(target_os = "linux")]
fn drm_sysfs_telemetry(root: &Path, adapter: &Adapter) -> Option<TelemetryReading> {
    if adapter.vendor_id == 0 || adapter.device_id == 0 {
        return None;
    }
    let mut matches = Vec::new();
    for entry in fs::read_dir(root).ok()?.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !name
            .strip_prefix("card")
            .is_some_and(|suffix| !suffix.is_empty() && suffix.chars().all(|c| c.is_ascii_digit()))
        {
            continue;
        }
        let device = entry.path().join("device");
        if read_hex_u32(&device.join("vendor")) == Some(adapter.vendor_id)
            && read_hex_u32(&device.join("device")) == Some(adapter.device_id)
        {
            matches.push((name, device));
        }
    }
    let [(name, device)] = matches.as_slice() else {
        return None;
    };
    let temperature_c = read_first_glob(&device.join("hwmon"), "temp1_input").map(|n| n / 1000.0);
    temperature_c?;
    let core_clock_mhz = fs::read_to_string(device.join("gt_cur_freq_mhz"))
        .ok()
        .and_then(|value| value.trim().parse().ok());
    Some(TelemetryReading {
        provider: format!("Linux DRM {name} hwmon"),
        temperature_c,
        core_clock_mhz,
        memory_clock_mhz: None,
    })
}

#[cfg(target_os = "linux")]
fn read_first_glob(root: &Path, file: &str) -> Option<f64> {
    fs::read_dir(root).ok()?.flatten().find_map(|entry| {
        fs::read_to_string(entry.path().join(file))
            .ok()?
            .trim()
            .parse()
            .ok()
    })
}
#[derive(Debug, Clone)]
struct OsMemoryAdapter {
    name: String,
    vendor_id: Option<u32>,
    device_id: Option<u32>,
    total_mib: u64,
    source: String,
}

fn enumerate_gpu_candidates() -> Vec<GpuCandidate> {
    candidates_for_instance(&wgpu::Instance::default())
}

fn candidates_for_instance(instance: &wgpu::Instance) -> Vec<GpuCandidate> {
    let memory = os_memory_adapters();
    instance
        .enumerate_adapters(wgpu::Backends::PRIMARY)
        .into_iter()
        .enumerate()
        .map(|(index, handle)| {
            let info = handle.get_info();
            GpuCandidate {
                report: adapter_report(index, &info, &memory),
                handle,
            }
        })
        .collect()
}

fn adapter_report(index: usize, info: &wgpu::AdapterInfo, memory: &[OsMemoryAdapter]) -> Adapter {
    let match_by_id = memory.iter().find(|candidate| {
        candidate.vendor_id == Some(info.vendor)
            && candidate.device_id == Some(info.device)
            && info.vendor != 0
    });
    let normalized_name = normalize_adapter_name(&info.name);
    let match_by_name = memory.iter().find(|candidate| {
        let candidate_name = normalize_adapter_name(&candidate.name);
        !candidate_name.is_empty()
            && (candidate_name.contains(&normalized_name)
                || normalized_name.contains(&candidate_name))
    });
    let detected = match_by_id.or(match_by_name);
    Adapter {
        index,
        name: info.name.clone(),
        backend: format!("WebGPU {:?}", info.backend),
        device_type: device_type_name(info.device_type).into(),
        vendor_id: info.vendor,
        device_id: info.device,
        detected_vram_mib: detected.map(|candidate| candidate.total_mib),
        source: detected
            .map(|candidate| candidate.source.clone())
            .unwrap_or_else(|| "not exposed by the operating-system driver".into()),
    }
}

fn device_type_name(device_type: wgpu::DeviceType) -> &'static str {
    match device_type {
        wgpu::DeviceType::DiscreteGpu => "discrete GPU",
        wgpu::DeviceType::IntegratedGpu => "integrated GPU",
        wgpu::DeviceType::VirtualGpu => "virtual GPU",
        wgpu::DeviceType::Cpu => "software",
        wgpu::DeviceType::Other => "other",
    }
}

fn normalize_adapter_name(name: &str) -> String {
    name.chars()
        .filter(|character| character.is_ascii_alphanumeric())
        .flat_map(char::to_lowercase)
        .collect()
}

fn os_memory_adapters() -> Vec<OsMemoryAdapter> {
    #[cfg(target_os = "windows")]
    {
        return windows_memory_adapters();
    }
    #[cfg(target_os = "linux")]
    {
        let mut adapters = linux_drm_memory_adapters(Path::new("/sys/class/drm"));
        for adapter in nvidia_memory_adapters() {
            if !adapters.iter().any(|known| {
                normalize_adapter_name(&known.name) == normalize_adapter_name(&adapter.name)
            }) {
                adapters.push(adapter);
            }
        }
        return adapters;
    }
    #[cfg(target_os = "macos")]
    {
        return macos_memory_adapters();
    }
    #[allow(unreachable_code)]
    Vec::new()
}

#[cfg(target_os = "macos")]
fn macos_memory_adapters() -> Vec<OsMemoryAdapter> {
    metal::Device::all()
        .into_iter()
        .filter_map(|device| {
            let total_mib = device.recommended_max_working_set_size() / MIB;
            (total_mib > 0).then(|| OsMemoryAdapter {
                name: device.name().to_string(),
                vendor_id: None,
                device_id: None,
                total_mib,
                source: "Metal recommendedMaxWorkingSetSize".into(),
            })
        })
        .collect()
}

#[cfg(target_os = "linux")]
fn linux_drm_memory_adapters(root: &Path) -> Vec<OsMemoryAdapter> {
    let mut adapters = Vec::new();
    let Ok(entries) = fs::read_dir(root) else {
        return adapters;
    };
    for entry in entries.flatten() {
        let file_name = entry.file_name();
        let name = file_name.to_string_lossy();
        if !name
            .strip_prefix("card")
            .is_some_and(|suffix| !suffix.is_empty() && suffix.chars().all(|c| c.is_ascii_digit()))
        {
            continue;
        }
        let device = entry.path().join("device");
        let Some(total_bytes) = read_u64(&device.join("mem_info_vram_total")) else {
            continue;
        };
        if total_bytes < MIB {
            continue;
        }
        adapters.push(OsMemoryAdapter {
            name: fs::read_to_string(device.join("product_name"))
                .ok()
                .map(|value| value.trim().to_string())
                .unwrap_or_default(),
            vendor_id: read_hex_u32(&device.join("vendor")),
            device_id: read_hex_u32(&device.join("device")),
            total_mib: total_bytes / MIB,
            source: format!("Linux DRM {} mem_info_vram_total", name),
        });
    }
    adapters
}

#[cfg(target_os = "linux")]
fn read_u64(path: &Path) -> Option<u64> {
    fs::read_to_string(path).ok()?.trim().parse().ok()
}

#[cfg(target_os = "linux")]
fn read_hex_u32(path: &Path) -> Option<u32> {
    let value = fs::read_to_string(path).ok()?;
    u32::from_str_radix(value.trim().trim_start_matches("0x"), 16).ok()
}

#[cfg(target_os = "linux")]
fn nvidia_memory_adapters() -> Vec<OsMemoryAdapter> {
    let Some(text) = command_text(
        "nvidia-smi",
        &[
            "--query-gpu=name,memory.total,pci.device_id",
            "--format=csv,noheader,nounits",
        ],
    ) else {
        return Vec::new();
    };
    parse_nvidia_inventory(&text)
}

#[cfg(target_os = "linux")]
fn parse_nvidia_inventory(text: &str) -> Vec<OsMemoryAdapter> {
    text.lines()
        .filter_map(|line| {
            let fields: Vec<_> = line.split(',').map(str::trim).collect();
            let total_mib = fields.get(1)?.parse().ok()?;
            let combined_id = fields
                .get(2)
                .and_then(|value| u32::from_str_radix(value.trim_start_matches("0x"), 16).ok());
            Some(OsMemoryAdapter {
                name: fields.first()?.to_string(),
                vendor_id: Some(0x10de),
                device_id: combined_id.map(|value| value >> 16),
                total_mib,
                source: "nvidia-smi reported memory.total".into(),
            })
        })
        .collect()
}

#[cfg(target_os = "windows")]
fn windows_memory_adapters() -> Vec<OsMemoryAdapter> {
    use windows::Win32::Graphics::Dxgi::{CreateDXGIFactory1, IDXGIFactory1};

    let Ok(factory) = (unsafe { CreateDXGIFactory1::<IDXGIFactory1>() }) else {
        return Vec::new();
    };
    let mut adapters = Vec::new();
    let mut index = 0;
    while let Ok(adapter) = unsafe { factory.EnumAdapters1(index) } {
        let Ok(description) = (unsafe { adapter.GetDesc1() }) else {
            index += 1;
            continue;
        };
        let end = description
            .Description
            .iter()
            .position(|character| *character == 0)
            .unwrap_or(description.Description.len());
        if description.DedicatedVideoMemory >= MIB as usize {
            adapters.push(OsMemoryAdapter {
                name: String::from_utf16_lossy(&description.Description[..end]),
                vendor_id: Some(description.VendorId),
                device_id: Some(description.DeviceId),
                total_mib: description.DedicatedVideoMemory as u64 / MIB,
                source: "Windows DXGI DedicatedVideoMemory".into(),
            });
        }
        index += 1;
    }
    adapters
}
fn hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "local machine".into())
}
fn write_report(dir: &Path, report: &Report) -> Result<()> {
    fs::create_dir_all(dir).with_context(|| format!("Could not create {}", dir.display()))?;
    fs::write(
        dir.join("report.json"),
        serde_json::to_string_pretty(report)?,
    )?;
    fs::write(dir.join("report.html"), render_html(report))?;
    Ok(())
}
fn render_html(r: &Report) -> String {
    let rows = r
        .patterns
        .iter()
        .map(|p| {
            format!(
                "<tr><td>{}</td><td>{} MiB</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                esc(&p.name),
                p.bytes / MIB,
                p.mismatches,
                p.windows,
                esc(&p.status)
            )
        })
        .collect::<String>();
    let coverage = r
        .limits
        .coverage_percent
        .map(|n| format!("{n:.1}%"))
        .unwrap_or_else(|| "not available".into());
    let telemetry_rows = if r.telemetry.samples.is_empty() {
        "<p>Not available on this machine.</p>".into()
    } else {
        format!("<table><thead><tr><th>Phase</th><th>Temperature</th><th>Core clock</th><th>Memory clock</th></tr></thead><tbody>{}</tbody></table>", r.telemetry.samples.iter().map(|sample| format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>", esc(&sample.phase), units(sample.temperature_c, "°C"), units(sample.core_clock_mhz, "MHz"), units(sample.memory_clock_mhz, "MHz"))).collect::<String>())
    };
    format!(
        r#"<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VRAM Field Test report</title><style>body{{font-family:system-ui;max-width:760px;margin:40px auto;padding:0 20px;color:#181714}}h1{{font-family:monospace}}.pass{{color:#176a44}}.fail{{color:#9c251d}}table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #777;padding:9px;text-align:left}}.stamp{{border:3px solid;padding:8px;display:inline-block;font-weight:bold}}</style></head><body><main><p>VRAM FIELD TEST / local evidence report</p><h1>Memory pattern report</h1><p class="stamp {status}">{status}</p><p>{summary}</p><h2>Coverage from this completed run</h2><p>Tested {tested} MiB. Detected VRAM on this host: {detected}. Coverage from this run: {coverage}.</p><p>Resident memory: {resident} MiB in {allocation_count} distinct allocation(s). Retained through pattern checks: {retained}.</p><h2>Patterns</h2><table><thead><tr><th>Pattern</th><th>Bytes</th><th>Mismatches</th><th>Windows</th><th>Status</th></tr></thead><tbody>{rows}</tbody></table><h2>Thermals and clocks</h2><p>Provider: {provider}. {telemetry_note}</p>{telemetry_rows}<h2>Limits</h2><p>Thermal stop: {thermal}. Total duration limit: {seconds}s. Each GPU chunk is at most {chunk} MiB.</p><h2>Read before using this report</h2><p>{notes}</p></main></body></html>"#,
        status = esc(&r.verdict.status),
        summary = esc(&r.verdict.summary),
        tested = r.limits.tested_mib,
        detected = r
            .limits
            .detected_vram_mib
            .map(|n| format!("{n} MiB"))
            .unwrap_or_else(|| "not exposed".into()),
        coverage = coverage,
        resident = r.limits.resident_mib,
        allocation_count = r.limits.resident_allocations,
        retained = if r.residency.retained_through_patterns {
            "yes"
        } else {
            "no"
        },
        rows = rows,
        provider = esc(&r.telemetry.provider),
        telemetry_note = esc(r.telemetry.unavailable_reason.as_deref().unwrap_or("")),
        telemetry_rows = telemetry_rows,
        thermal = r
            .limits
            .thermal_limit_c
            .map(|limit| format!("{limit}°C"))
            .unwrap_or_else(|| "not active".into()),
        seconds = r.limits.max_seconds,
        chunk = r.limits.chunk_mib,
        notes = r
            .notes
            .iter()
            .map(|n| format!("<p>{}</p>", esc(n)))
            .collect::<String>()
    )
}
fn units(value: Option<f64>, suffix: &str) -> String {
    value
        .map(|n| format!("{n:.1} {suffix}"))
        .unwrap_or_else(|| "not reported".into())
}
fn esc(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn plan_calculates_the_requested_amount_in_windows() {
        let plan = coverage_plan(98_304, None, 90, 16_384);
        assert_eq!(plan.requested_mib, 88_474);
        assert!(plan.requested_percent >= 90.0);
        assert_eq!(plan.windows, 6);
    }
    #[test]
    fn explicit_plan_request_is_not_capped_at_one_window() {
        let plan = coverage_plan(98_304, Some(88_474), 90, 1_024);
        assert_eq!(plan.windows, 87);
        assert_eq!(plan.requested_mib, 88_474);
    }
    #[test]
    fn plan_uses_unique_allocations_for_the_requested_amount() {
        let plan = coverage_plan(98_304, None, 90, 16_384);
        let allocations =
            allocation_specs(plan.requested_mib * MIB, MAX_CHUNK_MIB * MIB, 16_384 * MIB);
        assert_eq!(allocations.len(), 1_383);
        assert_eq!(
            allocations
                .iter()
                .map(|allocation| allocation.bytes)
                .sum::<u64>(),
            plan.requested_mib * MIB
        );
        for pair in allocations.windows(2) {
            assert_eq!(pair[0].offset_bytes + pair[0].bytes, pair[1].offset_bytes);
            assert_ne!(pair[0].ordinal, pair[1].ordinal);
        }

        assert_eq!(
            allocations.len(),
            1_383,
            "the full target is split into unique allocations"
        );
    }
    #[test]
    fn automatic_run_refuses_an_unknown_memory_total() {
        let error = resolve_requested_mib(None, None, 90, 1024).unwrap_err();
        assert!(error.to_string().contains("did not report GPU memory"));
        assert_eq!(
            resolve_requested_mib(None, Some(512), 90, 1024).unwrap().1,
            512
        );
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn nvidia_inventory_parser_keeps_each_adapter_and_total() {
        let adapters = parse_nvidia_inventory(
            "NVIDIA RTX 6000 Ada, 49140, 0x26B110DE\nNVIDIA RTX 4090, 24564, 0x268410DE\n",
        );
        assert_eq!(adapters.len(), 2);
        assert_eq!(adapters[0].total_mib, 49_140);
        assert_eq!(adapters[0].vendor_id, Some(0x10de));
        assert_eq!(adapters[0].device_id, Some(0x26b1));
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn linux_inventory_reads_each_drm_adapter_total() {
        let root = tempfile::tempdir().unwrap();
        for (card, vendor, device, mib) in [
            ("card0", "0x1002", "0x744c", 24_576u64),
            ("card1", "0x8086", "0x56c0", 16_384u64),
        ] {
            let path = root.path().join(card).join("device");
            fs::create_dir_all(&path).unwrap();
            fs::write(path.join("vendor"), vendor).unwrap();
            fs::write(path.join("device"), device).unwrap();
            fs::write(path.join("mem_info_vram_total"), (mib * MIB).to_string()).unwrap();
        }
        fs::create_dir_all(root.path().join("renderD128").join("device")).unwrap();
        let adapters = linux_drm_memory_adapters(root.path());
        assert_eq!(adapters.len(), 2);
        assert_eq!(
            adapters
                .iter()
                .find(|adapter| adapter.vendor_id == Some(0x1002))
                .unwrap()
                .total_mib,
            24_576
        );
        assert_eq!(
            adapters
                .iter()
                .find(|adapter| adapter.vendor_id == Some(0x8086))
                .unwrap()
                .total_mib,
            16_384
        );
    }
    #[test]
    fn selected_adapter_telemetry_never_falls_back_to_the_first_gpu() {
        let selected = Adapter {
            index: 1,
            name: "NVIDIA RTX 4090".into(),
            backend: "WebGPU Vulkan".into(),
            device_type: "discrete GPU".into(),
            vendor_id: 0x10de,
            device_id: 0x2684,
            detected_vram_mib: Some(24_564),
            source: "fixture".into(),
        };
        let rows = "NVIDIA RTX 6000 Ada, 0x26B110DE, 79, 1530, 9501\nNVIDIA RTX 4090, 0x268410DE, 61, 2200, 10001\n";
        let reading = select_nvidia_telemetry(rows, &selected).unwrap();
        assert_eq!(reading.temperature_c, Some(61.0));
        assert_eq!(reading.core_clock_mhz, Some(2200.0));

        let ambiguous = "NVIDIA RTX 4090, 0x268410DE, 61, 2200, 10001\nNVIDIA RTX 4090, 0x268410DE, 73, 2100, 9999\n";
        assert!(select_nvidia_telemetry(ambiguous, &selected).is_none());
    }
    #[test]
    fn hardware_run_requires_temperature_and_stops_if_it_disappears() {
        let unavailable = Telemetry {
            provider: "not available for selected adapter".into(),
            samples: vec![TelemetrySample {
                at_ms: 0,
                phase: "before run".into(),
                temperature_c: None,
                core_clock_mhz: None,
                memory_clock_mhz: None,
            }],
            unavailable_reason: Some("fixture".into()),
        };
        let error = thermal_limit_for_run(&unavailable, false, false).unwrap_err();
        assert!(error
            .to_string()
            .contains("selected adapter is unavailable"));
        assert_eq!(
            thermal_limit_for_run(&unavailable, true, false).unwrap(),
            None
        );
        assert_eq!(
            thermal_limit_for_run(&unavailable, false, true).unwrap(),
            None
        );
        assert!(thermal_stop_sample(&unavailable.samples[0], 85)
            .unwrap()
            .contains("became unavailable"));

        let available = Telemetry {
            samples: vec![TelemetrySample {
                temperature_c: Some(55.0),
                ..unavailable.samples[0].clone()
            }],
            unavailable_reason: None,
            ..unavailable
        };
        assert_eq!(
            thermal_limit_for_run(&available, false, false).unwrap(),
            Some(85)
        );
        let hot = TelemetrySample {
            temperature_c: Some(85.0),
            ..available.samples[0].clone()
        };
        assert!(thermal_stop_sample(&hot, 85)
            .unwrap()
            .contains("at or above the 85°C limit"));
    }
    #[cfg(target_os = "linux")]
    #[test]
    fn drm_telemetry_reads_only_the_selected_adapter() {
        let root = tempfile::tempdir().unwrap();
        for (card, vendor, device, temperature) in [
            ("card0", "0x1002", "0x744c", "79000"),
            ("card1", "0x8086", "0x56c0", "57000"),
        ] {
            let path = root.path().join(card).join("device");
            fs::create_dir_all(path.join("hwmon").join("hwmon0")).unwrap();
            fs::write(path.join("vendor"), vendor).unwrap();
            fs::write(path.join("device"), device).unwrap();
            fs::write(
                path.join("hwmon").join("hwmon0").join("temp1_input"),
                temperature,
            )
            .unwrap();
        }
        let selected = Adapter {
            index: 1,
            name: "Intel Arc".into(),
            backend: "WebGPU Vulkan".into(),
            device_type: "discrete GPU".into(),
            vendor_id: 0x8086,
            device_id: 0x56c0,
            detected_vram_mib: Some(16_384),
            source: "fixture".into(),
        };
        let reading = drm_sysfs_telemetry(root.path(), &selected).unwrap();
        assert_eq!(reading.temperature_c, Some(57.0));
        assert!(reading.provider.contains("card1"));
    }
    #[test]
    fn html_includes_completed_run_coverage_and_telemetry() {
        let r: Report =
            serde_json::from_str(include_str!("../examples/sample-report.json")).unwrap();
        let html = render_html(&r);
        assert!(html.contains("Coverage from this completed run"));
        assert!(html.contains("Thermals and clocks"));
    }
    #[test]
    fn coverage_is_absent_until_all_three_patterns_complete() {
        let mut report: Report =
            serde_json::from_str(include_str!("../examples/sample-report.json")).unwrap();
        assert_eq!(
            completed_run_coverage(
                report.adapter.detected_vram_mib,
                &report.patterns,
                &report.verdict.status,
            ),
            Some(93.75)
        );

        report.patterns.truncate(2);
        report.verdict.status = "incomplete".into();
        assert_eq!(
            completed_run_coverage(
                report.adapter.detected_vram_mib,
                &report.patterns,
                &report.verdict.status,
            ),
            None
        );
        report.limits.coverage_percent = None;
        let html = render_html(&report);
        assert!(html.contains("Coverage from this run: not available."));
    }
    #[test]
    fn write_report_uses_the_requested_local_directory() {
        let report: Report =
            serde_json::from_str(include_str!("../examples/sample-report.json")).unwrap();
        let directory = tempfile::tempdir().unwrap();
        assert_eq!(
            save_report_and_exit_code(directory.path(), &report).unwrap(),
            0
        );
        assert!(directory.path().join("report.json").is_file());
        assert!(directory.path().join("report.html").is_file());
    }
    #[test]
    fn stop_reports_are_saved_and_mismatches_map_to_exit_two() {
        let mut report: Report =
            serde_json::from_str(include_str!("../examples/sample-report.json")).unwrap();
        report.verdict.status = "incomplete".into();
        report.verdict.summary = "Stopped safely at the time limit.".into();
        report.patterns.truncate(2);
        let directory = tempfile::tempdir().unwrap();
        assert_eq!(
            save_report_and_exit_code(directory.path(), &report).unwrap(),
            1
        );
        let saved: Report = serde_json::from_str(
            &fs::read_to_string(directory.path().join("report.json")).unwrap(),
        )
        .unwrap();
        assert_eq!(saved.verdict.status, "incomplete");
        assert_eq!(report_exit_code(&saved), 1);
        assert!(directory.path().join("report.html").is_file());

        report.verdict.status = "fail".into();
        report.patterns[0].mismatches = 1;
        assert_eq!(
            save_report_and_exit_code(directory.path(), &report).unwrap(),
            2
        );
    }
}
