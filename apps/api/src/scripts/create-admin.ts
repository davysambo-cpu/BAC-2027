import { argon2id, hash } from "argon2";

import { displayNameSchema, passwordSchema, usernameSchema } from "@bac-2027/contracts";

import { environment } from "../config/env";
import { createDatabaseConnection } from "../db/client";
import { users } from "../db/schema";

const username = usernameSchema.parse(process.env.ADMIN_USERNAME);
const displayName = displayNameSchema.parse(process.env.ADMIN_DISPLAY_NAME);
const password = passwordSchema.parse(process.env.ADMIN_PASSWORD);

const connection = await createDatabaseConnection();
try {
  const passwordHash = await hash(password, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const [created] = await connection.database
    .insert(users)
    .values({
      username,
      displayName,
      passwordHash,
      passwordChangedAt: new Date(),
      role: "admin",
      status: "active",
      storageQuotaBytes: environment.DEFAULT_USER_STORAGE_QUOTA_MB * 1024 * 1024,
    })
    .onConflictDoNothing()
    .returning({ id: users.id });

  if (!created) {
    console.error(`Administrator @${username} already exists; no account was changed.`);
    process.exitCode = 1;
  } else {
    console.info(`Administrator @${username} created with the ${connection.driver} driver.`);
  }
} finally {
  await connection.close();
}
