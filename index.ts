import { glob } from "glob";
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from "fs";
import { dirname, join, basename } from "path";
import { parse, stringify } from "yaml";

interface TemplateFile {
  file: string;
  output: string;
  templateFolder?: string;
}

interface TemplateConfig {
  name: string;
  description: string;
  category: string;
  globalConfig?: {
    templatePath?: string;
  };
  steps: Array<{
    files?: TemplateFile[];
  }>;
}

interface TemplateInfo {
  name: string;
  description: string;
  category: string;
  path: string;
}

/**
 * Find all templates.yaml files one level deep in the templates folder
 */
async function findTemplateFiles(): Promise<string[]> {
  return await glob("templates/*/templates.yaml");
}

/**
 * Find all template files to copy (all files in template directories)
 */
async function findAllTemplateFiles(templateDir: string): Promise<string[]> {
  const templateSubfolder = basename(templateDir);
  return await glob(`templates/${templateSubfolder}/**/*`, { nodir: true });
}

/**
 * Parse a YAML file and return the config
 */
function parseTemplateConfig(filePath: string): TemplateConfig {
  const yamlContent = readFileSync(filePath, "utf8");
  return parse(yamlContent) as TemplateConfig;
}

/**
 * Process file paths in the template configuration
 * Returns a new config without modifying the original
 */
function processFilePaths(
  config: TemplateConfig,
  templateSubfolder: string
): TemplateConfig {
  // Create a deep copy to avoid modifying the original
  const newConfig = JSON.parse(JSON.stringify(config)) as TemplateConfig;

  if (!newConfig.steps) return newConfig;

  for (const step of newConfig.steps) {
    if (!step.files) continue;

    for (const file of step.files) {
      // Determine template path - prioritize file.templateFolder if it exists
      let templatePath = "";
      if (file.templateFolder) {
        templatePath = file.templateFolder;
      } else if (newConfig.globalConfig?.templatePath) {
        templatePath = newConfig.globalConfig.templatePath;
      }

      // Skip the path prefix if it's just "./"
      if (templatePath === "./") {
        templatePath = "";
      }

      // Clean up paths and combine them
      const normalizedTemplatePath = templatePath
        ? templatePath.endsWith("/")
          ? templatePath
          : `${templatePath}/`
        : "";
      file.file = `/${templateSubfolder}/${normalizedTemplatePath}${file.file}`;
    }
  }

  return newConfig;
}

/**
 * Extract template info for the output JSON
 */
function extractTemplateInfo(
  config: TemplateConfig,
  templateSubfolder: string
): TemplateInfo {
  return {
    name: config.name || "",
    description: config.description || "",
    category: config.category || "",
    path: `/${templateSubfolder}`,
  };
}

/**
 * Copy all template files to the build directory
 */
async function copyTemplateFiles(templatePath: string): Promise<void> {
  // Get template subfolder (e.g., "simple" from "templates/simple/templates.yaml")
  const templateSubfolder = basename(dirname(templatePath));
  const destinationDir = join("build", templateSubfolder);

  // Create destination directory if it doesn't exist
  if (!existsSync(destinationDir)) {
    mkdirSync(destinationDir, { recursive: true });
  }

  // Find all files in the template directory
  const allFiles = await findAllTemplateFiles(templateSubfolder);

  // Copy each file to the build directory
  for (const file of allFiles) {
    const relativePath = file.replace(`templates/${templateSubfolder}/`, "");
    const destinationPath = join(destinationDir, relativePath);

    // Create directories if needed
    const destDir = dirname(destinationPath);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    // Copy the file
    try {
      cpSync(file, destinationPath);
    } catch (error) {
      console.error(`Error copying ${file} to ${destinationPath}:`, error);
    }
  }
}

/**
 * Write the resulting JSON to the output file
 */
function writeOutputJson(templateInfos: TemplateInfo[]): void {
  const outputJson = JSON.stringify(templateInfos, null, 2);

  // Ensure build directory exists
  const buildDir = "build";
  if (!existsSync(buildDir)) {
    mkdirSync(buildDir, { recursive: true });
  }

  // Write to the output file
  const outputPath = join(buildDir, "index.json");
  writeFileSync(outputPath, outputJson);
  console.log(`Templates info written to ${outputPath}`);
}

async function main() {
  try {
    const templateYamlFiles = await findTemplateFiles();
    const templateInfos: TemplateInfo[] = [];

    for (const yamlFilePath of templateYamlFiles) {
      try {
        // Get template subfolder
        const templateSubfolder = basename(dirname(yamlFilePath));

        // Copy all template files to build directory
        await copyTemplateFiles(yamlFilePath);

        // Parse the original config
        const config = parseTemplateConfig(yamlFilePath);

        // Process file paths and create a new config (without modifying the original)
        const processedConfig = processFilePaths(config, templateSubfolder);

        // Write the processed config to the build directory
        const buildYamlPath = join("build", templateSubfolder, "index.json");
        writeFileSync(buildYamlPath, JSON.stringify(processedConfig, null, 2));

        // Extract info for the final output
        const templateInfo = extractTemplateInfo(config, templateSubfolder);
        templateInfos.push(templateInfo);
      } catch (error) {
        console.error(`Error processing ${yamlFilePath}:`, error);
      }
    }

    // Write the final output
    writeOutputJson(templateInfos);
  } catch (error) {
    console.error("Process failed:", error);
  }
}

main().catch(console.error);
