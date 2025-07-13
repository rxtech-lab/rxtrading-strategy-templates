#!/usr/bin/env bun
import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import Ajv from 'ajv';

const schema = {
  "title": "Repository schema",
  "description": "This schema describes the structure of config file for a repository.",
  "required": ["name", "jobs"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the repository."
    },
    "description": {
      "type": "string",
      "description": "Description of the repository."
    },
    "category": {
      "type": "string",
      "description": "Category of the repository."
    },
    "globalConfig": {
      "type": "object",
      "title": "Global configuration",
      "description": "Global configuration for the repository."
    },
    "environment": {
      "type": "object",
      "title": "Environment variables",
      "description": "Environment variables for the repository."
    },
    "form": {
      "type": "object",
      "title": "Form",
      "description": "Global form for the repository."
    },
    "permissions": {
      "type": "array",
      "title": "Permissions",
      "description": "List of permissions for the repository.",
      "items": {
        "type": "string"
      }
    },
    "lifecycle": {
      "type": "array",
      "description": "List of lifecycle events at the global level."
    },
    "jobs": {
      "type": "array",
      "description": "List of jobs for the repository.",
      "items": {
        "type": "object",
        "required": ["name", "steps"],
        "properties": {
          "name": {
            "type": "string",
            "description": "Name of the job."
          },
          "steps": {
            "type": "array",
            "description": "List of steps for the job.",
            "items": {
              "type": "object",
              "required": ["type"],
              "properties": {
                "type": {
                  "type": "string",
                  "enum": ["template", "bash", "copy"]
                },
                "name": {
                  "type": "string"
                },
                "files": {
                  "type": "array"
                },
                "command": {
                  "type": "string"
                },
                "lifecycle": {
                  "type": "array"
                },
                "form": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
  },
  "type": "object"
};

async function validateTemplates() {
  console.log('🔍 Searching for templates.yaml files...');
  
  const files = await glob('**/templates.yaml', {
    ignore: ['node_modules/**', '.git/**', 'build/**', 'dist/**']
  });
  
  console.log(`📁 Found ${files.length} templates.yaml files:`);
  files.forEach(file => console.log(`  - ${file}`));
  
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  
  let allValid = true;
  
  for (const file of files) {
    console.log(`\n🔍 Validating ${file}...`);
    
    try {
      const content = readFileSync(file, 'utf8');
      const data = parse(content);
      
      const isValid = validate(data);
      
      if (isValid) {
        console.log(`✅ ${file} is valid`);
      } else {
        console.log(`❌ ${file} has validation errors:`);
        validate.errors?.forEach(error => {
          console.log(`  - ${error.instancePath || 'root'}: ${error.message}`);
          if (error.data !== undefined) {
            console.log(`    Current value: ${JSON.stringify(error.data)}`);
          }
        });
        allValid = false;
      }
    } catch (error) {
      console.log(`❌ Error processing ${file}:`, error);
      allValid = false;
    }
  }
  
  console.log(`\n📊 Validation complete`);
  if (allValid) {
    console.log('✅ All templates.yaml files are valid!');
    process.exit(0);
  } else {
    console.log('❌ Some templates.yaml files have validation errors');
    process.exit(1);
  }
}

validateTemplates().catch(console.error);