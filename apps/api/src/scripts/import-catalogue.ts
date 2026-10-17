import { environment } from "../config/env";
import { createDatabaseConnection } from "../db/client";
import { importInitialCatalogue } from "../modules/catalogue/catalogue.import";

const connection = await createDatabaseConnection(environment);
try {
  const summary = await importInitialCatalogue(connection.database);
  console.info(
    [
      "Catalogue initial importé :",
      `${summary.subjects} matières,`,
      `${summary.sources} sources,`,
      `${summary.items} entrées,`,
      `${summary.studentVisibleItems} visibles en Série D,`,
      `${summary.hiddenOtherSeriesItems} masquées car étiquetées pour une autre série.`,
    ].join(" "),
  );
} finally {
  await connection.close();
}
