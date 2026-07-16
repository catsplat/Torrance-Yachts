import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"

const [outputArgument] = process.argv.slice(2)
const outputDirectory = path.resolve(outputArgument ?? "")
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY

if (!outputArgument || !url || !secret) {
  throw new Error("Output path, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SECRET_KEY are required.")
}

const client = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const manifest = []

function safeRelativeName(value) {
  const normalized = path.posix.normalize(value)
  if (normalized.startsWith("../") || normalized === ".." || path.posix.isAbsolute(normalized)) {
    throw new Error("Unsafe storage object path rejected.")
  }
  return normalized
}

async function exportFolder(bucketId, prefix = "") {
  let offset = 0
  while (true) {
    const { data, error } = await client.storage.from(bucketId).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    })
    if (error) throw error
    for (const entry of data) {
      const objectName = safeRelativeName(prefix ? `${prefix}/${entry.name}` : entry.name)
      if (entry.id === null) {
        await exportFolder(bucketId, objectName)
        continue
      }
      const { data: blob, error: downloadError } = await client.storage
        .from(bucketId).download(objectName)
      if (downloadError) throw downloadError
      const bytes = Buffer.from(await blob.arrayBuffer())
      const target = path.join(outputDirectory, safeRelativeName(bucketId), objectName)
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, bytes)
      manifest.push({
        bucket: bucketId,
        bytes: bytes.length,
        object: objectName,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      })
    }
    if (data.length < 1000) break
    offset += data.length
  }
}

await mkdir(outputDirectory, { recursive: true })
const { data: buckets, error: bucketError } = await client.storage.listBuckets()
if (bucketError) throw bucketError
for (const bucket of buckets) await exportFolder(bucket.id)
await writeFile(
  path.join(outputDirectory, "storage-manifest.json"),
  `${JSON.stringify({ exportedAt: new Date().toISOString(), objects: manifest }, null, 2)}\n`,
)
console.log(`Exported ${manifest.length} private storage objects.`)
