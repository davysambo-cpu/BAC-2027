import { AppShell } from "../components/AppShell";

interface PlaceholderPageProps {
  eyebrow: string;
  title: string;
  description: string;
  nextPart: string;
}

export function PlaceholderPage({ eyebrow, title, description, nextPart }: PlaceholderPageProps) {
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="ui-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <section className="panel-card placeholder-panel">
        <span>À venir</span>
        <h2>Le parcours est déjà conçu</h2>
        <p>
          Cette rubrique sera raccordée aux données réelles pendant {nextPart}. Les comptes et
          protections de la Partie 4 sont déjà actifs.
        </p>
      </section>
    </AppShell>
  );
}
