import { environment } from "../config/env";
import { createDatabaseConnection } from "./client";
import { subjects } from "./schema";

async function seed() {
  if (environment.NODE_ENV === "production") {
    throw new Error("Demo seed is forbidden in production.");
  }
  if (!environment.SEED_DEMO_DATA) {
    throw new Error("Set SEED_DEMO_DATA=true to load explicitly non-official demo subjects.");
  }

  const connection = await createDatabaseConnection();
  try {
    await connection.database
      .insert(subjects)
      .values([
        {
          code: "DEMO-MATH",
          name: "Mathématiques — démonstration",
          position: 10,
          isOfficial: false,
          sourceReference: "Prototype uniquement — à remplacer après validation officielle",
        },
        {
          code: "DEMO-SVT",
          name: "SVT — démonstration",
          position: 20,
          isOfficial: false,
          sourceReference: "Prototype uniquement — à remplacer après validation officielle",
        },
        {
          code: "DEMO-SP",
          name: "Sciences physiques — démonstration",
          position: 30,
          isOfficial: false,
          sourceReference: "Prototype uniquement — à remplacer après validation officielle",
        },
      ])
      .onConflictDoNothing();
  } finally {
    await connection.close();
  }
}

await seed();
console.info("Demo data inserted.");
