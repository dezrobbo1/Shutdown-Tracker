export function App() {
  return (
    <div className="mobile-frame">
      <header className="mobile-header">
        <div>
          <p className="eyebrow">Mobile App</p>
          <h1>Assigned Tasks</h1>
        </div>
        <span className="client-boundary">Tier 2 / Tier 3 client</span>
      </header>

      <main className="mobile-content">
        <p className="connection-boundary" role="note">
          Mobile operational data is not connected.
        </p>

        <section className="empty-state" aria-labelledby="assigned-tasks-empty-heading">
          <p className="eyebrow">Assigned work</p>
          <h2 id="assigned-tasks-empty-heading">No assigned tasks available</h2>
          <p>
            Identity, assignment, and task APIs are not connected. This app does not
            load or store operational task data.
          </p>
        </section>
      </main>
    </div>
  );
}
