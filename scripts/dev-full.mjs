import "../server/load-env.mjs";
import { spawn } from "node:child_process";

const processes = [
  { name: "server", command: "node", args: ["server/index.mjs"] },
  { name: "vite", command: "npm", args: ["run", "dev"] },
];

const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
    }
  });

  return child;
});

const shutdown = () => {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
