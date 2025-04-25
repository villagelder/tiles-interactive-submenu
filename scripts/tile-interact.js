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
        this.object.getFlag("tiles-interactive-submenu", "interactions") || [],
    };
  }

  async _updateObject(event, formData) {
    const data = expandObject(formData);
    await this.object.setFlag(
      "tiles-interactive-submenu",
      "interactions",
      data.interactions
    );
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".add-interaction").click((ev) => {
      const interactions =
        this.object.getFlag("tiles-interactive-submenu", "interactions") || [];
      if (interactions.length >= 8) {
        ui.notifications.warn("Maximum 8 interactions allowed per tile.");
        return;
      }
      interactions.push({ type: "" });
      this.object.setFlag(
        "tiles-interactive-submenu",
        "interactions",
        interactions
      );
      this.render();
    });

    html.find(".delete-all").click((ev) => {
      this.object.unsetFlag("tiles-interactive-submenu", "interactions");
      this.render();
    });

    html.find(".delete-interaction").click((ev) => {
      const index = Number(
        ev.currentTarget.closest(".interaction-card").dataset.index
      );
      const interactions =
        this.object.getFlag("tiles-interactive-submenu", "interactions") || [];
      interactions.splice(index, 1);
      this.object.setFlag(
        "tiles-interactive-submenu",
        "interactions",
        interactions
      );
      this.render();
    });
  }
}
