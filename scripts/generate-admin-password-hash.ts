import { hashPassword } from "@/lib/admin-security"

const password = process.argv[2]

if (!password) {
  throw new Error('Usage: pnpm admin:hash-password "your-password"')
}

hashPassword(password)
  .then((hash) => console.info(hash))
  .catch((error: unknown) => {
    console.error("Unable to generate password hash.", error)
    process.exitCode = 1
  })
