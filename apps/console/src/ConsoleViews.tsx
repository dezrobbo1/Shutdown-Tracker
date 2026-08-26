import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { ConsoleSection, StatusTone } from "./consoleData";

type TemporaryProject = {
  id: string;
  name: string;
  code: string;
  site: string;
};

export function StatusLabel({ children, tone = "neutral" }: { children: ReactNode; tone?: StatusTone }) {
  return <span className={`status-label status-${tone}`}>{children}</span>;
}

export function LoginView({ onContinue, roundTripMode = false }: { onContinue: () => void; roundTripMode?: boolean }) {
  return (
    <main className="entry-screen">
      <section className="entry-panel" aria-labelledby="login-title">
        <div className="entry-brand" aria-hidden="true">ST</div>
        <p className="eyebrow">Master Console · Tier 1</p>
        <h1 id="login-title">Shutdown Tracker</h1>
        <p className="entry-lead">Whole-project operational control, schedule-source review, and shutdown oversight.</p>
        <div className="implementation-note">
          <strong>{roundTripMode ? "Tier 1 Project round-trip trial" : "No production session"}</strong>
          <span>{roundTripMode ? "Browser-local experimental workflow. No production persistence or approved export contract." : "OIDC and production session handling are not yet implemented. No project data is preloaded."}</span>
        </div>
        <button className="button-primary" type="button" onClick={onContinue}>Continue to Projects Home</button>
        <p className="entry-footnote">No credentials are collected or stored by this review shell.</p>
      </section>
    </main>
  );
}

export function ProjectsHome({
  onOpenProject,
  temporaryProject,
  roundTripMode = false
}: {
  onOpenProject: (projectId: string) => void;
  temporaryProject?: TemporaryProject;
  roundTripMode?: boolean;
}) {
  const [query, setQuery] = useState("");

  if (!roundTripMode) {
    return (
      <main className="projects-screen">
        <header className="projects-header">
          <div>
            <p className="eyebrow">Master Console · Tier 1</p>
            <h1>Projects Home</h1>
            <p>No production project source is configured for this frontend.</p>
          </div>
          <div className="header-control-group">
            <StatusLabel tone="warning">No active project</StatusLabel>
            <button type="button" disabled title="Project creation API is not implemented">Create Project</button>
          </div>
        </header>
        <section className="detail-panel roundtrip-empty-project" aria-labelledby="no-project-heading">
          <h2 id="no-project-heading">No projects available</h2>
          <p>Use Import / Export to inspect a Microsoft Project XML/MSPDI source locally or review configured snapshots read-only.</p>
          <button className="button-primary" type="button" onClick={() => onOpenProject("ordinary-import")}>Open Import / Export</button>
          <span>Local inspection does not create, activate, or persist a Tracker project.</span>
        </section>
        <p className="surface-caption">Project creation, lifecycle actions, archive, restore, and production switching remain not implemented.</p>
      </main>
    );
  }

  const availableProjects = temporaryProject
    ? [{ ...temporaryProject, statusLabel: "Temporary trial", period: "Imported source · controlled trial clock", updated: "Temporary browser-memory project" }]
    : [{ id: "roundtrip-empty", name: "No source selected", code: "LOCAL-XML-TRIAL", site: "Browser-local", statusLabel: "Temporary trial", period: "Choose a disposable Microsoft Project XML/MSPDI source", updated: "Nothing imported or persisted" }];
  const visibleProjects = availableProjects.filter((project) => {
    const searchText = `${project.name} ${project.code} ${project.site}`.toLowerCase();
    return searchText.includes(query.trim().toLowerCase());
  });

  return (
    <main className="projects-screen">
      <header className="projects-header">
        <div>
          <p className="eyebrow">Master Console · Tier 1</p>
          <h1>Projects Home</h1>
          <p>Open the local XML trial entry point; the imported source will become the temporary project.</p>
        </div>
        <div className="header-control-group">
          <StatusLabel tone="warning">Tier 1 Project round-trip trial</StatusLabel>
          <button type="button" disabled title="Project creation API is not implemented">Create Project</button>
        </div>
      </header>

      <section className="project-tools" aria-label="Project search">
        <label className="search-control">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Search projects</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code, or site" />
        </label>
        <span>One temporary browser-memory trial entry point</span>
      </section>

      <section className="table-panel" aria-label="Projects">
        <div className="table-scroll">
          <table className="data-table projects-table">
            <thead><tr><th>Project</th><th>Status</th><th>Site / asset</th><th>Planned shutdown</th><th>Latest state</th><th><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {visibleProjects.map((project) => (
                <tr key={project.id}>
                  <td><strong>{project.name}</strong><span>{project.code}</span></td>
                  <td><StatusLabel tone="warning">{project.statusLabel}</StatusLabel></td>
                  <td>{project.site}</td><td>{project.period}</td><td>{project.updated}</td>
                  <td><button className="button-link" type="button" onClick={() => onOpenProject(project.id)}>{temporaryProject ? "Open project" : "Choose XML source"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="surface-caption">Browser-local experimental workflow · No production persistence · No approved export contract.</p>
    </main>
  );
}

export function NoActiveProjectView({ section, onOpenImport }: { section: Exclude<ConsoleSection, "Import / Export">; onOpenImport: () => void }) {
  return (
    <section className="detail-panel roundtrip-empty-project" aria-labelledby="no-active-project-heading">
      <h1 id="no-active-project-heading">No active project</h1>
      <p>{section} has no schedule or operational records to show. Select a source before project data can be shown.</p>
      <button className="button-primary" type="button" onClick={onOpenImport}>Open Import / Export</button>
      <span>Local XML inspection is read-only. It does not activate or persist a Tracker project.</span>
    </section>
  );
}

export function PageHeading({ eyebrow, title, description, status }: { eyebrow: string; title: string; description: string; status: string }) {
  return <header className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div><StatusLabel tone="warning">{status}</StatusLabel></header>;
}

export function PanelHeading({ title, detail }: { title: string; detail: string }) {
  return <header className="panel-heading"><div><h2>{title}</h2><p>{detail}</p></div></header>;
}
