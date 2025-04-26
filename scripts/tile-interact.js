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
    new TileInteractDialog(hud.object.document).render(true);
  });

  html.find(".left").append(toolsButton);
});

// --- Initialization ---
Hooks.once("init", async () => {
  console.log("🛠️ VE Tiles Interactive Submenu | Initializing...");

  // Handlebars helpers
  Handlebars.registerHelper("eq", (a, b) => a === b);

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

  Handlebars.registerHelper("abilities", () => [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
  ]);

  Handlebars.registerHelper("conditionsList", () => [
    "blinded",
    "charmed",
    "deafened",
    "fatigued",
    "frightened",
    "grappled",
    "incapacitated",
    "invisible",
    "paralyzed",
    "petrified",
    "poisoned",
    "prone",
    "restrained",
    "stunned",
    "unconscious",
    "exhaustion",
  ]);

  Handlebars.registerHelper("capitalize", (text) => {
    if (typeof text !== "string") return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  });

  // Preload partials
  const partials = [
    "templates/interaction-card.html",
    "templates/fields/attack.html",
    "templates/fields/saving-throw.html",
    "templates/fields/skill-check.html",
    "templates/fields/unlock.html",
    "templates/fields/trap.html",
    "templates/fields/spell-target.html",
  ];

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
});

// --- Tile Interact Dialog ---
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
    const interactions = data.interactions || [];

    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      if (interaction.type === "attack" && !interaction.invulnerable) {
        const ac = interaction.ac;
        const hp = interaction.hp;
        if (
          !Number.isInteger(ac) ||
          ac < 0 ||
          !Number.isInteger(hp) ||
          hp < 0
        ) {
          ui.notifications.error(
            `Interaction ${i + 1}: AC and HP must be positive integers.`
          );
          throw new Error(
            "Validation failed: AC/HP must be positive integers."
          );
        }
      }
    }

    await this.object.setFlag(
      "ve-tiles-interactive-submenu",
      "interactions",
      interactions
    );
  }

  activateListeners(html) {
    super.activateListeners(html);

    // --- Handle Interaction Type change
    html.find(".interaction-type").change((ev) => {
      const select = ev.currentTarget;
      const index = Number(select.closest(".interaction-card").dataset.index);
      const selectedType = select.value;
      const interactions =
        this.object.getFlag("ve-tiles-interactive-submenu", "interactions") ||
        [];

      interactions[index].type = selectedType;

      this.object
        .setFlag("ve-tiles-interactive-submenu", "interactions", interactions)
        .then(() => this.render());
    });

    // --- Invulnerable checkbox disables AC/HP
    html.find(".field-invulnerable").change((ev) => {
      const checkbox = ev.currentTarget;
      const row = checkbox.closest(".form-group");
      const acField = row.querySelector(".field-ac");
      const hpField = row.querySelector(".field-hp");

      const disabled = checkbox.checked;
      acField.disabled = disabled;
      hpField.disabled = disabled;

      acField.classList.toggle("disabled-field", disabled);
      hpField.classList.toggle("disabled-field", disabled);
    });

    // --- Add Interaction
    html.find(".add-interaction").click(() => {
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
        .then(() => this.render());
    });

    // --- Delete All Interactions
    html.find(".delete-all").click(() => {
      this.object
        .unsetFlag("ve-tiles-interactive-submenu", "interactions")
        .then(() => this.render());
    });

    // --- Delete Single Interaction
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
        .then(() => this.render());
    });

    // --- Multiselect damage types
    html.find(".damage-select").change((ev) => {
      const select = ev.currentTarget;
      const value = select.value;
      if (!value) return;

      const type = select.dataset.type;
      const card = select.closest(".interaction-card");
      const tagContainer = $(card).find(`.damage-tags.${type}`);

      const tag = $(`
        <span class="damage-tag" data-value="${value}" data-type="${type}">
          ${value.charAt(0).toUpperCase() + value.slice(1)}
          <a class="remove-tag" title="Remove">×</a>
        </span>
      `);
      tagContainer.append(tag);

      select.querySelector(`option[value="${value}"]`).remove();
      select.value = "";

      this._saveDamageSelections($(card));
    });

    // --- Multiselect conditions
    html.find(".condition-select").change((ev) => {
      const select = ev.currentTarget;
      const value = select.value;
      if (!value) return;

      const type = select.dataset.type;
      const card = select.closest(".interaction-card");
      const tagContainer = $(card).find(`.damage-tags.${type}`);

      const tag = $(`
        <span class="damage-tag" data-value="${value}" data-type="${type}">
          ${value.charAt(0).toUpperCase() + value.slice(1)}
          <a class="remove-tag" title="Remove">×</a>
        </span>
      `);
      tagContainer.append(tag);

      select.querySelector(`option[value="${value}"]`).remove();
      select.value = "";

      this._saveConditionSelections($(card));
    });

    // --- Handle removing tags
    html.on("click", ".remove-tag", (ev) => {
      const tag = $(ev.currentTarget).closest(".damage-tag");
      const value = tag.data("value");
      const type = tag.data("type");
      const card = tag.closest(".interaction-card");
      const select = $(card).find(`select[data-type="${type}"]`);

      const option = $(
        `<option value="${value}">${
          value.charAt(0).toUpperCase() + value.slice(1)
        }</option>`
      );
      select.append(option);

      this._sortSelect(select);
      tag.remove();

      if (["vulnerabilities", "resistances", "immunities"].includes(type)) {
        this._saveDamageSelections(card);
      } else if (type === "conditions") {
        this._saveConditionSelections(card);
      }
    });

    // --- Test Trap button
    html.find(".test-trap-button").click(async (ev) => {
      const card = ev.currentTarget.closest(".interaction-card");
      const index = Number($(card).data("index"));

      const interactions =
        this.object.getFlag("ve-tiles-interactive-submenu", "interactions") ||
        [];
      const interaction = interactions[index];

      if (!interaction) {
        ui.notifications.error("No trap interaction data found.");
        return;
      }

      let output = `<h2>Trap Test</h2>`;

      if (interaction.saveDC && Number(interaction.saveDC) > 0) {
        const roll = new Roll("1d20 + 2");
        await roll.evaluate({ async: true });

        const total = roll.total;
        const result = total >= interaction.saveDC ? "SUCCESS" : "FAILURE";
        output += `<p><strong>Saving Throw (DC ${interaction.saveDC}):</strong> ${total} → ${result}</p>`;
      }

      if (interaction.damage) {
        const dmgRoll = new Roll(interaction.damage);
        await dmgRoll.evaluate({ async: true });
        output += `<p><strong>Damage:</strong> ${dmgRoll.total} (${interaction.damage})</p>`;
      }

      if (interaction.conditions?.length > 0) {
        output += `<p><strong>Applied Conditions:</strong> ${interaction.conditions.join(
          ", "
        )}</p>`;
      }

      ChatMessage.create({
        content: output,
        whisper: [game.user.id],
        speaker: { alias: "Trap Tester" },
      });
    });
  }

  async _saveDamageSelections(card) {
    const vulnerabilities = [
      ...card.find(".damage-tags.vulnerabilities .damage-tag"),
    ].map((t) => t.dataset.value);
    const resistances = [
      ...card.find(".damage-tags.resistances .damage-tag"),
    ].map((t) => t.dataset.value);
    const immunities = [
      ...card.find(".damage-tags.immunities .damage-tag"),
    ].map((t) => t.dataset.value);

    const index = Number(card.data("index"));
    const interactions =
      this.object.getFlag("ve-tiles-interactive-submenu", "interactions") || [];

    interactions[index].vulnerabilities = vulnerabilities;
    interactions[index].resistances = resistances;
    interactions[index].immunities = immunities;

    await this.object.setFlag(
      "ve-tiles-interactive-submenu",
      "interactions",
      interactions
    );
  }

  async _saveConditionSelections(card) {
    const conditions = [
      ...card.find(".damage-tags.conditions .damage-tag"),
    ].map((t) => t.dataset.value);

    const index = Number(card.data("index"));
    const interactions =
      this.object.getFlag("ve-tiles-interactive-submenu", "interactions") || [];

    interactions[index].conditions = conditions;

    await this.object.setFlag(
      "ve-tiles-interactive-submenu",
      "interactions",
      interactions
    );
  }

  _sortSelect(select) {
    const options = select
      .find("option")
      .toArray()
      .sort((a, b) => {
        if (!a.value) return -1;
        if (!b.value) return 1;
        return a.text.localeCompare(b.text);
      });
    select.empty().append(options);
  }
}
