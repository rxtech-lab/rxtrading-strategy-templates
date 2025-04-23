# Template Processor

This script processes template configuration files in the `templates` directory, adjusting file paths and generating a summary JSON file. The original files are not modified - all processed files are written to the `build` directory.

## Features

- Finds all `templates.yaml` files one level deep in the `templates` directory
- Copies all template files to the `build` directory
- Processes file paths in each template configuration
- Generates a summary JSON file with template information

## Usage

```bash
# Install dependencies
bun install

# Run the script
bun run start

# Or use the convenience script
./run.sh
```

## Output

The script generates the following outputs:

1. All template files are copied to the build directory with the same structure:

   - `/templates/simple/go.mod.tmpl` → `/build/simple/go.mod.tmpl`

2. Processed templates.yaml files are written to the build directory:

   - `/templates/simple/templates.yaml` → `/build/simple/templates.yaml`

3. A JSON file at `build/index.json` containing information about all template configurations:

```json
[
  {
    "name": "Template Name",
    "description": "Template Description",
    "category": "Template Category",
    "path": "/template-subdirectory"
  }
]
```

## File Path Processing

For each file in a template configuration:

1. If `file.templateFolder` exists, it takes priority over `globalConfig.templatePath`
2. The final file path is constructed as `/{templateSubfolder}/{templatePath}/{originalFilePath}`
3. The modified configurations are saved to the build directory, not to the original files

## Schema Reference

Template configurations should follow the schema available at:
https://rx-snippet-repo-spec-visulization.vercel.app/api/spec/repository?content-type=json
