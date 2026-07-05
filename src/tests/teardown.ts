export default function teardown() {
  // Fuerza a Node.js a salir una vez que Vitest termina.
  // Esto soluciona el problema de los "open handles" de las conexiones de Firebase y Redis
  // que mantienen vivo el Event Loop infinitamente y congelan el emulador.
  process.exit(0);
}
