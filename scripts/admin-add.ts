/**
 * Primer ingreso (docs/ESPECIFICACION.md §4.16): da acceso al panel a una
 * administradora cuando la tabla `admin_users` todavía está vacía. Después,
 * las usuarias se administran desde Configuración → Usuarias del panel.
 *
 * Uso:  npm run admin:add -- email@gmail.com "Nombre"
 * Usa DATABASE_URL de .env.local.
 */
import { AppError } from "@/server/errors/app-error";
import { grantAdminAccess } from "@/server/services/access.service";

async function main(): Promise<number> {
  const [email, name] = process.argv.slice(2);
  if (!email || !name) {
    process.stderr.write('Uso: npm run admin:add -- email@gmail.com "Nombre"\n');
    return 1;
  }
  try {
    const admin = await grantAdminAccess(email, name);
    process.stdout.write(`Acceso otorgado a ${admin.name} <${admin.email}>.\n`);
    return 0;
  } catch (error: unknown) {
    const message = error instanceof AppError || error instanceof Error ? error.message : String(error);
    process.stderr.write(`No se pudo otorgar el acceso: ${message}\n`);
    return 1;
  }
}

main().then(
  (code) => process.exit(code),
  () => process.exit(1),
);
