import { join } from "path";
import { writeFileSync } from "fs";
import { ServerlessInstance, PluginOptions, UvConfig } from "./types";
import { UvUtils } from "./utils";

class UvRequirementsPlugin {
  hooks: Record<string, () => void>;
  private config: Required<UvConfig>;

  constructor(
    private serverless: ServerlessInstance,
    private options: PluginOptions
  ) {
    // Validate runtime
    this.validatePythonRuntime();

    // Merge configuration
    const userConfig = this.serverless.service.custom?.uv || {};
    this.config = UvUtils.mergeConfig(userConfig);

    // Set working directory
    if (!this.config.cwd || this.config.cwd === process.cwd()) {
      this.config.cwd =
        this.serverless.service.custom?.uv?.cwd || process.cwd();
    }

    // Enable verbose mode from CLI options
    if (this.options.verbose) {
      this.config.verbose = true;
    }

    this.hooks = {
      "before:package:createDeploymentArtifacts":
        this.generateRequirements.bind(this),
    };

    this.log("UV Requirements plugin initialized", "INFO");
  }

  /**
   * Validate that the service uses a Python runtime
   */
  private validatePythonRuntime(): void {
    const runtime = this.serverless.service.provider.runtime;
    if (runtime && !runtime.startsWith("python")) {
      this.log(
        `Warning: Runtime '${runtime}' is not Python. This plugin is designed for Python runtimes.`,
        "WARNING"
      );
    }
  }

  /**
   * Main method to generate requirements
   */
  async generateRequirements(): Promise<void> {
    try {
      this.log("Starting UV requirements generation...", "INFO");

      // Check if uv is available
      if (!UvUtils.isUvAvailable()) {
        const message = "uv is not available in the system PATH";
        if (this.config.skipIfMissing) {
          this.log(
            `${message}. Skipping UV requirements generation.`,
            "WARNING"
          );
          return;
        }
        throw new Error(
          `${message}. Install uv: https://docs.astral.sh/uv/getting-started/installation/`
        );
      }

      // Log uv version if verbose
      if (this.config.verbose) {
        const version = UvUtils.getUvVersion();
        if (version) {
          this.log(`Using ${version}`, "INFO");
        }
      }

      // Validate configuration
      UvUtils.validateConfig(this.config, this.config.cwd);

      // Build and execute command
      const command = UvUtils.buildCommand(this.config);

      this.log(`Executing: ${command.join(" ")}`, "INFO");

      const result = UvUtils.executeCommand(
        command,
        this.config.cwd,
        this.config.verbose
      );

      if (result.status !== 0) {
        const errorMessage =
          result.stderr || `Command failed with exit code ${result.status}`;
        throw new Error(`UV command failed: ${errorMessage}`);
      }

      // Handle freeze mode output redirection
      if (this.config.mode === "freeze") {
        if (result.stdout) {
          const outputPath = join(this.config.cwd, this.config.output);
          writeFileSync(outputPath, result.stdout);
          this.log(`Requirements frozen to ${this.config.output}`, "SUCCESS");
        }
      } else {
        this.log(`Requirements compiled to ${this.config.output}`, "SUCCESS");
      }

      // Show summary
      this.showSummary();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.log(`Error: ${errorMessage}`, "ERROR");
      throw error;
    }
  }

  /**
   * Show generation summary
   */
  private showSummary(): void {
    const mode = this.config.mode === "freeze" ? "Frozen" : "Compiled";
    const source =
      this.config.mode === "freeze"
        ? "current environment"
        : this.config.source;

    this.log(
      `✅ ${mode} Python dependencies from ${source} → ${this.config.output}`,
      "SUCCESS"
    );
  }

  /**
   * Enhanced logging with different levels
   */
  private log(
    message: string,
    level: "INFO" | "WARNING" | "ERROR" | "SUCCESS" = "INFO"
  ): void {
    const prefix = "[uv]";
    const emoji = {
      INFO: "ℹ️",
      WARNING: "⚠️",
      ERROR: "❌",
      SUCCESS: "✅",
    }[level];

    const formattedMessage = `${prefix} ${emoji} ${message}`;

    switch (level) {
      case "WARNING":
        this.serverless.cli.warn(formattedMessage);
        break;
      case "ERROR":
        this.serverless.cli.log(formattedMessage);
        break;
      default:
        this.serverless.cli.log(formattedMessage);
    }
  }
}

module.exports = UvRequirementsPlugin;
export default UvRequirementsPlugin;
