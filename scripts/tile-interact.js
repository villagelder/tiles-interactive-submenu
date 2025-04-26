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
  console.log("🛠️ VE Tiles Interactive Submenu | Initializing...");

  // Register helper for equality checking
  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  // List of all partial templates
  const partials = [
    "templates/interaction-card.html",
    "templates/fields/attack.html",
    "templates/fields/saving-throw.html",
    "templates/fields/skill-check.html",
    "templates/fields/unlock.html",
    "templates/fields/trap.html",
    "templates/fields/spell-target.html",
  ];

  // Fetch and register each partial
  for (let path of partials) {
    const fullPath = `modules/ve-tiles-interactive-submenu/${path}`;
    const response = await fetch(fullPath);
    if (!response.ok) {
      console.error(`Failed to load Handlebars partial: ${fullPath}`);
      continue;
    }
    const templateContent = await response.text();
    Handlebars.registerPartial(fullPath, templateContent);
    console.log(`✅ Registered Handlebars partial: ${fullPath}`);
  }

  Handlebars.registerHelper("damageTypes", () => [
    "acid",
    "bludgeoning",
    "cold",
    "fire",
    "force",
    "lightning",
    "necrotic",
    "piercing",
    "poison",
    "psychic",
    "radiant",
    "slashing",
    "thunder",
  ]);

  // Optional: Capitalize helper
  Handlebars.registerHelper("capitalize", (text) => {
    if (typeof text !== "string") return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  });
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

    html.find(".damage-select").change((ev) => {
      const select = ev.currentTarget;
      const type = select.dataset.type;
      const value = select.value;
      if (!value) return;

      const tagContainer = html.find(`.damage-tags.${type}`);
      const newTag = $(`
        <span class="damage-tag" data-value="${value}" data-type="${type}">
          ${value.charAt(0).toUpperCase() + value.slice(1)}
          <a class="remove-tag" title="Remove">×</a>
        </span>
      `);
      tagContainer.append(newTag);

      // Remove selected option from dropdown
      select.querySelector(`option[value="${value}"]`).remove();
      select.value = "";

      this._saveDamageSelections(html);
    });

    // Handle removing a damage type tag
    html.on("click", ".remove-tag", (ev) => {
      const tag = ev.currentTarget.parentElement;
      const value = tag.dataset.value;
      const type = tag.dataset.type;
      const select = html.find(`select.damage-select[data-type="${type}"]`);

      // Re-add option to dropdown
      const option = document.createElement("option");
      option.value = value;
      option.innerText = value.charAt(0).toUpperCase() + value.slice(1);
      select.append(option);

      tag.remove();

      this._saveDamageSelections(html);
    });

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

  async _saveDamageSelections(html) {
    const vulnerabilities = [
      ...html.find(".damage-tags.vulnerabilities .damage-tag"),
    ].map((tag) => tag.dataset.value);
    const resistances = [
      ...html.find(".damage-tags.resistances .damage-tag"),
    ].map((tag) => tag.dataset.value);
    const immunities = [
      ...html.find(".damage-tags.immunities .damage-tag"),
    ].map((tag) => tag.dataset.value);

    const interactions =
      this.object.getFlag("ve-tiles-interactive-submenu", "interactions") || [];
    const index = Number(html.closest(".interaction-card").dataset.index);

    interactions[index].vulnerabilities = vulnerabilities;
    interactions[index].resistances = resistances;
    interactions[index].immunities = immunities;

    await this.object.setFlag(
      "ve-tiles-interactive-submenu",
      "interactions",
      interactions
    );
  }
}

Hooks.once("init", () => {
  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });
});
