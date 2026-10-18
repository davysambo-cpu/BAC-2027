import { argon2id, hash } from "argon2";
import { and, asc, eq, ne, sql } from "drizzle-orm";

import { passwordSchema } from "@bac-2027/contracts";

import { environment } from "../config/env";
import { createDatabaseConnection } from "../db/client";
import { catalogueItems, revisionSessions, studentProfiles, users } from "../db/schema";

if (!environment.PILOT_SEED_DATA) {
  console.info("Pilot seed skipped: PILOT_SEED_DATA is disabled.");
  process.exit(0);
}
if (!environment.PILOT_MODE) throw new Error("Pilot seed requires PILOT_MODE=true.");
const pilotPassword = passwordSchema.parse(environment.PILOT_STUDENT_PASSWORD);

const connection = await createDatabaseConnection(environment);
try {
  const now = new Date();
  const passwordHash = await hash(pilotPassword, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  const [existing] = await connection.database
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = 'recette6'`)
    .limit(1);

  const studentId = existing?.id ?? "70000000-0000-4000-8000-000000000001";
  if (existing) {
    await connection.database
      .update(users)
      .set({
        displayName: "Élève Recette Planning",
        passwordHash,
        passwordChangedAt: now,
        role: "student",
        status: "active",
        disabledAt: null,
        updatedAt: now,
      })
      .where(eq(users.id, studentId));
  } else {
    await connection.database.insert(users).values({
      id: studentId,
      username: "recette6",
      displayName: "Élève Recette Planning",
      passwordHash,
      passwordChangedAt: now,
      role: "student",
      status: "active",
    });
  }

  await connection.database
    .insert(studentProfiles)
    .values({
      userId: studentId,
      seriesCode: "D",
      preferences: {
        dailyRevisionGoalMinutes: 45,
        downloadOnWifiOnly: true,
        reducedMotion: false,
      },
    })
    .onConflictDoUpdate({
      target: studentProfiles.userId,
      set: { seriesCode: "D", updatedAt: now },
    });

  const topics = await connection.database
    .select({ id: catalogueItems.id, subjectId: catalogueItems.subjectId })
    .from(catalogueItems)
    .where(
      and(
        eq(catalogueItems.isActive, true),
        ne(catalogueItems.seriesDScope, "explicitly_excludes"),
        ne(catalogueItems.validationStatus, "excluded"),
      ),
    )
    .orderBy(asc(catalogueItems.subjectId), asc(catalogueItems.subjectPosition))
    .limit(14);
  if (topics.length < 7) throw new Error("The pilot catalogue has not been imported.");

  const relativeDate = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1_000);
  const fixtures = [
    ["Reprendre les équations du cours", -72, 45, "Refaire les deux exemples sans regarder."],
    ["Corriger les exercices restés difficiles", -26, 30, "Noter précisément chaque erreur."],
    ["Relire les définitions essentielles", -2, 20, null],
    ["Restituer un chapitre sans le cahier", 1, 45, "Puis vérifier les oublis."],
    ["Faire trois exercices progressifs", 3, 60, null],
    ["Préparer les questions du prochain cours", 18, 30, "Lister les points bloquants."],
    ["Réviser avec une fiche très courte", 26, 30, null],
    ["Expliquer la notion à voix haute", 44, 45, "Utiliser ses propres mots."],
    ["Reprendre un ancien devoir", 72, 60, "Comparer la réponse et la correction."],
    ["Faire un bilan de la semaine", 120, 30, null],
    ["Anticiper le thème suivant", 168, 20, null],
    ["Révision générale sans matière", 216, 45, "Choisir la priorité le jour même."],
    ["Mémoriser les points clés", -96, 20, "Séance de démonstration terminée."],
    ["Vérifier les erreurs fréquentes", -48, 30, null],
    ["Résumer le cours en cinq lignes", -24, 45, null],
  ] as const;

  for (const [index, fixture] of fixtures.entries()) {
    const [title, hours, durationMinutes, notes] = fixture;
    const completed = index >= 12;
    const topic = index === 11 ? null : topics[index % topics.length]!;
    await connection.database
      .insert(revisionSessions)
      .values({
        id: `71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        studentId,
        subjectId: topic?.subjectId ?? null,
        catalogueItemId: topic?.id ?? null,
        title,
        notes,
        scheduledAt: relativeDate(hours),
        durationMinutes,
        status: completed ? "completed" : "planned",
        completedAt: completed ? relativeDate(-(index - 11)) : null,
      })
      .onConflictDoNothing({ target: revisionSessions.id });
  }

  console.info(`Pilot account @recette6 is ready with ${fixtures.length} planning sessions.`);
} finally {
  await connection.close();
}
