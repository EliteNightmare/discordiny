import glimmerIcon from "../../assets/icons/currencies/glimmer.png";
import lumiaLeavesIcon from "../../assets/icons/currencies/lumia-leaves.png";

import enhancementCoreIcon from "../../assets/icons/upgrade-materials/enhancement-core.png";
import enhancementPrismIcon from "../../assets/icons/upgrade-materials/enhancement-prism.png";
import ascendantShardIcon from "../../assets/icons/upgrade-materials/ascendant-shard.png";
import ascendantAlloyIcon from "../../assets/icons/upgrade-materials/ascendant-alloy.png";

import "./VaultMaterials.css";

type VaultMaterialsProps = {
  currencies: Record<string, number>;
  upgradeMaterials: Record<string, number>;
};

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function VaultMaterials({
  currencies,
  upgradeMaterials,
}: VaultMaterialsProps) {
  return (
    <section className="vault-materials">
      <div className="vault-materials-header">
        <span>INVENTORY</span>
        <h2>Materials</h2>
      </div>

      <div className="vault-material-group">
        <h3>Currencies</h3>

        <div className="vault-material-list">
          <div className="vault-material-row">
            <img
              src={glimmerIcon}
              alt=""
              className="vault-material-icon"
            />

            <div className="vault-material-info">
              <span>Glimmer</span>

              <strong>
                {formatNumber(
                  currencies["Glimmer"] ?? 0,
                )}
              </strong>
            </div>
          </div>

          <div className="vault-material-row">
            <img
              src={lumiaLeavesIcon}
              alt=""
              className="vault-material-icon"
            />

            <div className="vault-material-info">
              <span>Lumia Leaves</span>

              <strong>
                {formatNumber(
                  currencies["Lumia Leaves"] ?? 0,
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="vault-material-divider" />

      <div className="vault-material-group">
        <h3>Upgrade Materials</h3>

        <div className="vault-material-list">
          <div className="vault-material-row">
            <img
              src={enhancementCoreIcon}
              alt=""
              className="vault-material-icon"
            />

            <div className="vault-material-info">
              <span>Enhancement Core</span>

              <strong>
                {formatNumber(
                  upgradeMaterials[
                    "Enhancement Core"
                  ] ?? 0,
                )}
              </strong>
            </div>
          </div>

          <div className="vault-material-row">
            <img
              src={enhancementPrismIcon}
              alt=""
              className="vault-material-icon"
            />

            <div className="vault-material-info">
              <span>Enhancement Prism</span>

              <strong>
                {formatNumber(
                  upgradeMaterials[
                    "Enhancement Prism"
                  ] ?? 0,
                )}
              </strong>
            </div>
          </div>

          <div className="vault-material-row">
            <img
              src={ascendantShardIcon}
              alt=""
              className="vault-material-icon"
            />

            <div className="vault-material-info">
              <span>Ascendant Shard</span>

              <strong>
                {formatNumber(
                  upgradeMaterials[
                    "Ascendant Shard"
                  ] ?? 0,
                )}
              </strong>
            </div>
          </div>

          <div className="vault-material-row">
            <img
              src={ascendantAlloyIcon}
              alt=""
              className="vault-material-icon"
            />

            <div className="vault-material-info">
              <span>Ascendant Alloy</span>

              <strong>
                {formatNumber(
                  upgradeMaterials[
                    "Ascendant Alloy"
                  ] ?? 0,
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default VaultMaterials;
