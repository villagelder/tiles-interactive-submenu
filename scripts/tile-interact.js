// === tile-interact.js ===

// Hook into Tile HUD to add a Tools button
Hooks.on("renderTileHUD", (hud, html) => {
  if (!game.user.isGM) return;

  const toolsButton = $(`
      <div class="control-icon ve-tools" title="Edit Tile Interactions">
        <i class="fas fa-tools"></i>
      </div>
    `);

  toolsButton.on("click", () => {
    new TileInteractDialog(hud.object).render(true);
  });

  html.find(".left").append(toolsButton); // v12 tile HUD uses .left and .right columns
});

// The main interaction editing dialog
class TileInteractDialog extends FormApplication {
  constructor(object) {
    super(object);
    this.tile = object;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "tile-interact-dialog",
      title: "Interactive Tile Options",
      template:
        "modules/tiles-interactive-submenu/templates/interact-dialog.html",
      width: 600,
      height: 700,
      resizable: true,
      scrollY: [".interactions-list"],
    });
  }

  getData() {
    return {
      interactions:
        this.tile.getFlag("tiles-interactive-submenu", "interactions") || [],
    };
  }

  async _updateObject(event, formData) {
    const data = expandObject(formData);
    await this.tile.setFlag(
      "tiles-interactive-submenu",
      "interactions",
      data.interactions
    );
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Add a new interaction
    html.find(".add-interaction").click((ev) => {
      const interactions =
        this.tile.getFlag("tiles-interactive-submenu", "interactions") || [];
      if (interactions.length >= 8) {
        ui.notifications.warn("Maximum 8 interactions allowed per tile.");
        return;
      }
      interactions.push({ type: "" }); // Add a blank interaction
      this.tile.setFlag(
        "tiles-interactive-submenu",
        "interactions",
        interactions
      );
      this.render();
    });

    // Delete all interactions
    html.find(".delete-all").click((ev) => {
      this.tile.unsetFlag("tiles-interactive-submenu", "interactions");
      this.render();
    });

    // Delete a single interaction card
    html.find(".delete-interaction").click((ev) => {
      const index = Number(
        ev.currentTarget.closest(".interaction-card").dataset.index
      );
      const interactions =
        this.tile.getFlag("tiles-interactive-submenu", "interactions") || [];
      interactions.splice(index, 1); // Remove at index
      this.tile.setFlag(
        "tiles-interactive-submenu",
        "interactions",
        interactions
      );
      this.render();
    });
  }
}
