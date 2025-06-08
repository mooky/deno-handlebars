// Compile example:
// deno compile --allow-read --allow-write --allow-import --include VERSION.txt --include template.hbs -o main.exe main.js --template template.hb
// Run example:
// main.exe --data data.yaml --partials ./partials

import { parse as parseYaml } from "https://deno.land/std@0.224.0/yaml/mod.ts";
import Handlebars from "https://cdn.skypack.dev/handlebars@4.7.8?dts";
import { parseArgs } from "jsr:@std/cli/parse-args";


const flags = parseArgs(Deno.args, {
  boolean: ["help", "version"],
  string: ["template", "data", "output", "partials"],
  default: { help: false, version: false },
  alias: {
    t: "template",
    p: "partials",
    d: "data",
    o: "output",
    h: "help",
    v: "version",
  },
});

// Get the program name from the Deno executable path
// This is useful for displaying the program name in help messages and version output.
const programName = Deno.execPath().split(/[\/\\]/).pop();

// Read version from VERSION.txt
var version = `${programName} v0.0.0-SNAPSHOT`;
try {
  const versionFromFile = await (await Deno.readTextFile("VERSION.txt")).trim();
  version = `${programName} v${versionFromFile}`;
} catch {
  // If VERSION.txt is missing, report version as "0.0.0-SNAPSHOT"
}

if (flags.version) {
  console.log(version);
  Deno.exit(0);
}

// Check if required flags are provided
if (flags.help || !flags.template || !flags.data) {
  console.error(version);
  console.error(`\nUsage: ${programName} --template <template.html> --partials <partials-dir> --data <data.yaml> --output <output.html>`);
  Deno.exit(1);
}

const templatePath = flags.template;
const yamlPath = flags.data;
const outputPath = flags.output;

// Read and parse YAML data
const yamlContent = await Deno.readTextFile(yamlPath);
const data = parseYaml(yamlContent);

// Read Handlebars template
const templateContent = await Deno.readTextFile(templatePath);


/**
 * Loads and registers Handlebars partials from a directory.
 * @param {string} partialsDir - Directory containing partials (e.g., "./partials")
 */
async function registerPartials(partialsDir) {
  for await (const entry of Deno.readDir(partialsDir)) {
    if (entry.isFile && entry.name.endsWith(".hbs")) {
      const partialName = entry.name.replace(/\.hbs$/, "");
      const partialPath = `${partialsDir}/${entry.name}`;
      const partialContent = await Deno.readTextFile(partialPath);
      Handlebars.registerPartial(partialName, partialContent);
    }
  }
}

// Register partials if a --partials flag is provided
if (flags.partials && Deno.statSync(flags.partials).isDirectory) {
  await registerPartials(flags.partials);
}

// Compile and render template
try {
  const template = Handlebars.compile(templateContent);
  const html = template(data);  
    
  // Write output HTML file
  if (!!outputPath) {
    Deno.writeTextFileSync(outputPath, html);
    console.log(`Generated HTML file: ${outputPath}`);
  } else {
    console.info(html);
  }

} catch (error) {
    // Handle errors in template rendering
  console.error("Error rendering template:", error);
  Deno.exit(1);
}
