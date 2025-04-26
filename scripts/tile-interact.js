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
    new TileInteractDialog(hud.object.document).render(true); // ✅ notice `.document`
  });

  html.find(".left").append(toolsButton);
});

Hooks.once("init", async () => {
  // Helper for conditional logic
  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  // Register main interaction-card partial
  const cardTemplate = await fetch(
    "modules/ve-tiles-interactive-submenu/templates/interaction-card.html"
  ).then((res) => res.text());
  Handlebars.registerPartial(
    "modules/ve-tiles-interactive-submenu/templates/interaction-card.html",
    cardTemplate
  );
});

// The main interaction editing dialog
class TileInteractDialog extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "tile-interact-dialog",
      title: "Interactive Tile Options",
      template:
        "modules/ve-tiles-interactive-submenu/templates/interact-dialogue.html",
      width: 600,
      height: 700,
      resizable: true,
      scrollY: [".interactions-list"],
    });
  }

  getData() {
    return {
      interactions:
        this.object.getFlag("ve-tiles-interactive-submenu", "interactions") ||
        [],
    };
  }

  async _updateObject(event, formData) {
    const data = expandObject(formData);
    await this.object.setFlag(
      "ve-tiles-interactive-submenu",
      "interactions",
      data.interactions
    );
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Re-render the app when an interaction type is changed
    html.find(".interaction-type").change((ev) => {
      const select = ev.currentTarget;
      const index = Number(select.closest(".interaction-card").dataset.index);
      const selectedType = select.value;

      const interactions =
        this.object.getFlag("ve-tiles-interactive-submenu", "interactions") ||
        [];
      interactions[index].type = selectedType;

      // Save and re-render
      this.object
        .setFlag("ve-tiles-interactive-submenu", "interactions", interactions)
        .then(() => {
          this.render();
        });
    });

    // Add interaction
    html.find(".add-interaction").click((ev) => {
      const interactions =
        this.object.getFlag("ve-tiles-interactive-submenu", "interactions") ||
        [];
      if (interactions.length >= 8) {
        ui.notifications.warn("Maximum 8 interactions allowed per tile.");
        return;
      }
      interactions.push({ type: "" });
      this.object
        .setFlag("ve-tiles-interactive-submenu", "interactions", interactions)
        .then(() => {
          this.render();
        });
    });

    // Delete all
    html.find(".delete-all").click(() => {
      this.object
        .unsetFlag("ve-tiles-interactive-submenu", "interactions")
        .then(() => {
          this.render();
        });
    });

    // Delete a single card
    html.find(".delete-interaction").click((ev) => {
      const index = Number(
        ev.currentTarget.closest(".interaction-card").dataset.index
      );
      const interactions =
        this.object.getFlag("ve-tiles-interactive-submenu", "interactions") ||
        [];
      interactions.splice(index, 1);
      this.object
        .setFlag("ve-tiles-interactive-submenu", "interactions", interactions)
        .then(() => {
          this.render();
        });
    });
  }
}

Hooks.once("init", () => {
  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });
});
