import TopBar from "../components/TopBar";
import ArsenalLayout from "../components/arsenal/ArsenalLayout";

import "./Vault.css";

const VAULT_CATEGORIES = [
  {
    name: "Destinations",
    path: "/vault/destinations",
    description: "Destination weapon collections",
  },
  {
    name: "Fishing",
    path: "/vault/fishing",
    description: "Fishing weapon collections",
  },
  {
    name: "Dungeons",
    path: "/vault/dungeons",
    description: "Dungeon weapon collections",
  },
  {
    name: "Raids",
    path: "/vault/raids",
    description: "Raid weapon collections",
  },
  {
    name: "Strikes",
    path: "/vault/strikes",
    description: "Strike weapon collection",
  },
  {
    name: "Nightfalls",
    path: "/vault/nightfalls",
    description: "Nightfall weapon collection",
  },
  {
    name: "Grandmasters",
    path: "/vault/grandmasters",
    description: "Grandmaster weapon collection",
  },
  {
    name: "Infiltrations",
    path: "/vault/infiltrations",
    description: "Infiltration weapon collections",
  },
  {
    name: "Showdowns",
    path: "/vault/showdowns",
    description: "Showdown weapon collections",
  },
  {
    name: "Crawls",
    path: "/vault/crawls",
    description: "Crawl weapon collections",
  },
  {
    name: "Events",
    path: "/vault/events",
    description: "Event weapon collections",
  },
];

function Vault() {
  function navigate(path: string) {
    window.location.href = path;
  }

  return (
    <div className="vault-screen">
      <TopBar />

      <div className="vault-page">
        <ArsenalLayout
          left={
            <section className="vault-sidebar-placeholder">
              <div className="vault-sidebar-heading">
                <span className="vault-eyebrow">
                  INVENTORY
                </span>

                <h2>Materials</h2>
              </div>

              <p>
                Currencies and Upgrade Materials
                will appear here.
              </p>
            </section>
          }
        >
          <div className="vault-content">
            {/* LEGENDARY VAULT */}

            <section className="vault-block vault-legendary">
              <div className="vault-block-header">
                <div>
                  <span className="vault-eyebrow">
                    ARSENAL
                  </span>

                  <h1>Legendary Vault</h1>

                  <p>
                    Browse your Legendary weapon
                    collections by source.
                  </p>
                </div>
              </div>

              <div className="vault-category-grid">
                {VAULT_CATEGORIES.map((category) => (
                  <button
                    key={category.path}
                    type="button"
                    className="vault-category"
                    onClick={() => {
                      navigate(category.path);
                    }}
                  >
                    <span className="vault-category-name">
                      {category.name}
                    </span>

                    <span className="vault-category-description">
                      {category.description}
                    </span>

                    <span className="vault-category-arrow">
                      ›
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* EXOTIC VAULT */}

            <section className="vault-block vault-exotic">
              <div className="vault-block-header">
                <div>
                  <span className="vault-eyebrow">
                    ARSENAL
                  </span>

                  <h2>Exotic Vault</h2>

                  <p>
                    Exotic weapon collection.
                  </p>
                </div>
              </div>

              <div className="vault-coming-soon">
                <span>EXOTIC VAULT</span>

                <strong>COMING SOON</strong>
              </div>
            </section>
          </div>
        </ArsenalLayout>
      </div>
    </div>
  );
}

export default Vault;
