import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { confirm } from "@inquirer/prompts";
import { getConfigPath } from "../services/config.js";

/**
 * Default configuration content in JSONC format
 */
const DEFAULT_CONFIG_CONTENT = `{
  // Connection settings for the Berry server
  "server": {
    "url": "http://localhost:4114",
    "timeout": 5000
  },
  // Default values for new memories
  "defaults": {
    "type": "information",
    "createdBy": "user"
  }
}
`;

/**
 * Initialize Berry configuration
 */
export async function initCommand(): Promise<void> {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);

  console.log("");
  console.log("  Berry - Configuration Setup");
  console.log("  ============================");
  console.log("");

  // Check if config already exists
  if (existsSync(configPath)) {
    console.log(`  Configuration file already exists at:`);
    console.log(`  ${configPath}`);
    console.log("");

    const overwrite = await confirm({
      message: "Do you want to overwrite the existing configuration?",
      default: false,
    });

    if (!overwrite) {
      console.log("");
      console.log("  Configuration unchanged.");
      return;
    }
  }

  // Create config directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  // Write the default configuration
  writeFileSync(configPath, DEFAULT_CONFIG_CONTENT, "utf-8");

  console.log("");
  console.log("  Configuration created successfully!");
  console.log("");
  console.log(`  Location: ${configPath}`);
  console.log("");
  console.log("  You can customize the configuration by editing this file.");
  console.log("  Run `berry serve` to start the server.");
  console.log("");
}
