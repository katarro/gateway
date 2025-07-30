const { execSync } = require('child_process');
const chalk = require('chalk'); // npm install chalk si no lo tienes

async function runAllTests() {
  console.log(
    chalk.blue('🚀 Ejecutando todas las pruebas de Backend FreeQ...\n'),
  );

  const testAreas = [
    { name: 'CRUD y Gestión de Datos', cmd: 'npm run test:crud', count: 5 },
    {
      name: 'Configuración del Sistema',
      cmd: 'npm run test:configuracion',
      count: 4,
    },
    { name: 'Core del Negocio', cmd: 'npm run test:core', count: 4 },
    { name: 'Integración', cmd: 'npm run test:integracion', count: 2 },
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const area of testAreas) {
    try {
      console.log(chalk.yellow(`Ejecutando: ${area.name}...`));
      execSync(area.cmd, { stdio: 'pipe' });
      console.log(
        chalk.green(`✅ ${area.name}: ${area.count} pruebas PASADAS`),
      );
      totalPassed += area.count;
    } catch (error) {
      console.log(chalk.red(`❌ ${area.name}: FALLÓ`));
      totalFailed += area.count;
    }
  }

  console.log(chalk.blue('\n' + '='.repeat(50)));
  console.log(chalk.green(`🎉 RESUMEN FINAL:`));
  console.log(chalk.green(`✅ Total Pruebas Pasadas: ${totalPassed}/15`));

  if (totalFailed > 0) {
    console.log(chalk.red(`❌ Total Pruebas Fallidas: ${totalFailed}/15`));
  }

  console.log(chalk.blue('='.repeat(50)));
}

runAllTests();
