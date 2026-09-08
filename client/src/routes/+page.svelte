<script lang="ts">
  import { MatchOp, type QueryNode } from "@ncu-courses/shared/types/query";
  import {
    PasswordCard,
    Degree,
    Language,
    type Course,
  } from "@ncu-courses/shared/types/database";

  // --- Enums & Metadata ---
  const ENUMS: Record<string, {
    label: string;
    value: any;
  }[]> = {
    passwordCard: [
      { label: "不用", value: PasswordCard.NONE },
      { label: "可選", value: PasswordCard.OPTIONAL },
      { label: "必須", value: PasswordCard.ALL },
    ],
    targetDegree: [
      { label: "學士班", value: Degree.BACHELOR },
      { label: "碩士班", value: Degree.MASTER },
      { label: "博士班", value: Degree.DOCTERATE },
      { label: "碩士在職專班", value: Degree.WORKING_MASTER },
      { label: "碩博同修", value: Degree.MASTER_AND_DOCTERATE },
      { label: "師資培育", value: Degree.TEACHER },
    ],
    language: [
      { label: "國語", value: Language.CHINESE },
      { label: "客語", value: Language.HAKKA },
      { label: "法語", value: Language.FRENCH },
      { label: "英語", value: Language.ENGLISH },
      { label: "部份英語", value: Language.PARTIAL_ENGLISH },
      { label: "日語", value: Language.JAPANESE },
      { label: "部份客語", value: Language.PARTIAL_HAKKA },
    ],
    boolean: [
      { label: "是", value: true },
      { label: "否", value: false }
    ],
    clock: []
  };

  const xAxis = "日一二三四五六七";
  for (let x = 0; x < 7; ++x) {
    for (let y of "1234Z56789ABCD") {
      ENUMS.clock.push({
        label: xAxis[x] + " " + y,
        value: x + y
      });
    }
  }

  const SCALAR_FIELDS = [
    { id: "id", label: "流水號", type: "number" },
    { id: "classNumber", label: "課號", type: "string" },
    { id: "title", label: "標題", type: "string" },
    { id: "credits", label: "學分", type: "number" },
    { id: "people_limit", label: "人數上限", type: "number" },
    { id: "people_admitted", label: "已中選人數", type: "number" },
    { id: "people_applying", label: "待分發人數", type: "number" },
    { id: "passwordCard", label: "採用密碼卡", type: "enum_passwordCard" },
    { id: "department", label: "單位", type: "string" },
    { id: "required", label: "必修", type: "enum_boolean" },
    { id: "targetDegree", label: "學制", type: "enum_targetDegree" },
    { id: "language", label: "語言", type: "enum_language" },
  ];

  const ARRAY_FIELDS = [
    { id: "clocks", label: "時段", type: "enum_clock" },
    { id: "classrooms", label: "教室", type: "string" },
    { id: "teachers", label: "教師", type: "string" },
  ];



  // --- Types ---
  type Category = "scalar" | "array" | "logical" | "not";

  interface UIBlock {
    id: string;
    category: Category;
    field: string;
    op: string;
    value: any;
    eachOp: string;
    children: (UIBlock | null)[]; // List of child slots for logical blocks
    inner: UIBlock | null;
  }

  // --- State ---
  let rootSlot: UIBlock | null = $state(null);
  let spareBlocks: UIBlock[] = $state([]);
  let results: Course[] = $state([]);
  let isLoading = $state(false);
  let errorMsg = $state("");

  // Global D&D state
  let dragged: {
    isTemplate: boolean;
    category: Category;
    block: UIBlock | null;
  } | null = null;
  let isDraggingOverTrash = $state(false);

  // --- D&D Engine ---
  function createBlock(category: Category): UIBlock {
    return {
      id: crypto.randomUUID(),
      category,
      field: category === "array" ? "clocks" : "title",
      op: category === "logical" ? "and" : category === "array" ? "any" : "eq",
      eachOp: "eq",
      value: "",
      children: category === "logical" ? [null, null] : [],
      inner: null,
    };
  }

  function removeFromEverywhere(id: string): UIBlock | null {
    let found: UIBlock | null = null;

    if (rootSlot?.id === id) {
      found = rootSlot;
      rootSlot = null;
      return found;
    }

    const sIdx = spareBlocks.findIndex((b) => b.id === id);
    if (sIdx !== -1) {
      found = spareBlocks[sIdx];
      spareBlocks.splice(sIdx, 1);
      return found;
    }

    function walk(block: UIBlock | null) {
      if (!block) return;
      if (block.category === "logical") {
        for (let i = 0; i < block.children.length; i++) {
          if (block.children[i]?.id === id) {
            found = block.children[i];
            block.children[i] = null;
            return;
          }
          walk(block.children[i]);
        }
      } else if (block.category === "not") {
        if (block.inner?.id === id) {
          found = block.inner;
          block.inner = null;
          return;
        }
        walk(block.inner);
      }
    }

    walk(rootSlot);
    spareBlocks.forEach(walk);
    return found;
  }

  const stopProp = (e: Event) => e.stopPropagation();

  function onFieldChange(block: UIBlock) {
    const isArray = block.category === "array";
    const def = isArray
      ? ARRAY_FIELDS.find((f) => f.id === block.field)
      : SCALAR_FIELDS.find((f) => f.id === block.field);

    if (!def) return;
    const t = def.type;

    if (isArray) {
      block.value = t === "number" ? 0 : "";
      block.eachOp = "eq";
      return;
    }

    if (t === "number") {
      block.op = "eq";
      block.value = 0;
    } else if (t === "string") {
      block.op = "includes";
      block.value = "";
    } else if (t.startsWith("enum_")) {
      block.op = "eq";
      const enumKey = t.split("_")[1] as keyof typeof ENUMS;
      block.value = ENUMS[enumKey][0].value;
    }
  }

  function handleTrashDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDraggingOverTrash = false;
    if (!dragged || dragged.isTemplate) return;
    removeFromEverywhere(dragged.block!.id);
    dragged = null;
  }

  // --- Compilation & API ---
  function compileAST(block: UIBlock | null): QueryNode | null {
    if (!block) return null;

    if (block.category === "scalar") {
      const def = SCALAR_FIELDS.find((f) => f.id === block.field);
      let val = block.value;
      if (def && (def.type === "number" || def.type.startsWith("enum_")))
        val = Number(val);

      return {
        field: block.field,
        match: { op: block.op as MatchOp, value: val },
      };
    }
    if (block.category === "array") {
      const def = ARRAY_FIELDS.find((f) => f.id === block.field);
      let val = block.value;
      if (def && def.type === "number") val = Number(val);

      return {
        field: block.field,
        op: block.op as "any" | "all",
        each: { op: block.eachOp as MatchOp, value: val },
      };
    }
    if (block.category === "logical") {
      const nodes = block.children
        .map((child) => compileAST(child))
        .filter((node): node is QueryNode => node !== null);

      if (nodes.length === 0) return null;
      if (nodes.length === 1) return nodes[0];
      return block.op === "and" ? { and: nodes } : { or: nodes };
    }
    if (block.category === "not") {
      const inner = compileAST(block.inner);
      if (!inner) return null;
      return { not: inner };
    }
    return null;
  }

  async function submitQuery() {
    isLoading = true;
    errorMsg = "";

    const filter = compileAST(rootSlot);
    console.log(filter);

    try {
      const res = await fetch("api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: 500,
          offset: 0,
          ...(filter ? { filter } : {}),
        }),
      });
      if (!res.ok)
        throw new Error((await res.json()).message || `HTTP ${res.status}`);
      results = await res.json();
    } catch (err: any) {
      errorMsg = err.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<!-- SNIPPETS (Recursive Components) -->
{#snippet dropSlot(
  value: UIBlock | null,
  onDrop: (b: UIBlock) => void,
  isRoot = false,
)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="drop-slot {value ? 'filled' : 'empty'} {isRoot ? 'is-root' : ''}"
    ondragover={(e) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.add("drag-active");
    }}
    ondragleave={(e) => {
      e.currentTarget.classList.remove("drag-active");
    }}
    ondrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.classList.remove("drag-active");
      if (!dragged) return;

      let b = dragged.isTemplate
        ? createBlock(dragged.category)
        : dragged.block!;

      if (b.id === value?.id) {
        dragged = null;
        return;
      }

      if (!dragged.isTemplate) removeFromEverywhere(b.id);

      if (value) spareBlocks.push(value);

      onDrop(b);
      dragged = null;
    }}
  >
    {#if value}
      {@render blockNode(value)}
    {:else}
      <span class="placeholder">拉動方塊到這裡</span>
    {/if}
  </div>
{/snippet}

{#snippet blockNode(block: UIBlock)}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="scratch-block {block.category}"
    draggable="true"
    ondragstart={(e) => {
      e.stopPropagation();
      dragged = { isTemplate: false, category: block.category, block };
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", block.id);
      }
    }}
    onclick={(e) => {
      if (e.ctrlKey) {
        e.stopPropagation();
        let cloned = window.structuredClone($state.snapshot(block));
        cloned.id = crypto.randomUUID();
        spareBlocks.push(cloned);
      }
    }}
  >
    <div class="block-header drag-handle">
      <span class="icon">⠿</span>

      <!-- SCALAR UI -->
      {#if block.category === "scalar"}
        <select
          bind:value={block.field}
          onchange={() => onFieldChange(block)}
          onmousedown={stopProp}
          class="input-light"
        >
          {#each SCALAR_FIELDS as f}
            <option value={f.id}>{f.label}</option>
          {/each}
        </select>
        {@const fieldDef = SCALAR_FIELDS.find((f) => f.id === block.field)}
        <select
          bind:value={block.op}
          onmousedown={stopProp}
          class="input-light w-16"
        >
          {#if fieldDef?.type === "number"}
            <option value="eq">=</option><option value="neq">!=</option>
            <option value="gt">&gt;</option><option value="gte">&gt;=</option>
            <option value="lt">&lt;</option><option value="lte">&lt;=</option>
          {:else if fieldDef?.type === "string"}
            <option value="eq">=</option><option value="neq">!=</option>
            <option value="includes">包含</option>
          {:else}
            <option value="eq">=</option><option value="neq">!=</option>
          {/if}
        </select>
        {#if fieldDef?.type.startsWith("enum_")}
          <select
            bind:value={block.value}
            onmousedown={stopProp}
            class="input-light"
          >
            {#each ENUMS[fieldDef.type.split("_")[1] as keyof typeof ENUMS] as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        {:else}
          <input
            type={fieldDef?.type === "number" ? "number" : "text"}
            placeholder="輸入文字"
            bind:value={block.value}
            onmousedown={stopProp}
            class="input-light w-24"
          />
        {/if}

        <!-- ARRAY UI -->
      {:else if block.category === "array"}
        <select
          bind:value={block.field}
          onchange={() => onFieldChange(block)}
          onmousedown={stopProp}
          class="input-light"
        >
          {#each ARRAY_FIELDS as f}
            <option value={f.id}>{f.label}</option>
          {/each}
        </select>
        <select
          bind:value={block.op}
          onmousedown={stopProp}
          class="input-light w-16"
        >
          <option value="any">任一</option><option value="all">全部</option>
        </select>
        {@const arrayDef = ARRAY_FIELDS.find((f) => f.id === block.field)}
        <select
          bind:value={block.eachOp}
          onmousedown={stopProp}
          class="input-light w-16"
        >
          {#if arrayDef?.type === "number"}
            <option value="eq">=</option><option value="neq">!=</option>
            <option value="gt">&gt;</option><option value="gte">&gt;=</option>
            <option value="lt">&lt;</option><option value="lte">&lt;=</option>
          {:else if arrayDef?.type === "string"}
            <option value="eq">=</option><option value="neq">!=</option>
            <option value="includes">包含</option>
          {:else}
            <option value="eq">=</option><option value="neq">!=</option>
          {/if}
        </select>
        {#if arrayDef?.type.startsWith("enum_")}
          <select
            bind:value={block.value}
            onmousedown={stopProp}
            class="input-light"
          >
            {#each ENUMS[arrayDef.type.split("_")[1] as keyof typeof ENUMS] as opt}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        {:else}
          <input
            type={arrayDef?.type === "number" ? "number" : "text"}
            placeholder="輸入文字"
            bind:value={block.value}
            onmousedown={stopProp}
            class="input-light w-24"
          />
        {/if}

        <!-- LOGICAL UI -->
      {:else if block.category === "logical"}
        <select
          bind:value={block.op}
          onmousedown={stopProp}
          class="input-bold text-lg font-bold"
        >
          <option value="and">全部符合</option><option value="or"
            >任一符合</option
          >
        </select>

        <!-- NOT UI -->
      {:else if block.category === "not"}
        <span class="font-bold text-lg px-2">不要</span>
      {/if}
    </div>

    <!-- Nested Logic Slots -->
    {#if block.category === "logical"}
      <div class="c-body">
        {#each block.children as child, index}
          <div class="flex items-center gap-2">
            {@render dropSlot(child, (b) => (block.children[index] = b))}
            {#if block.children.length > 2}
              <button
                type="button"
                class="remove-slot-btn"
                title="移除條件位置"
                onclick={(e) => {
                  stopProp(e);
                  if (child) spareBlocks.push(child);
                  block.children.splice(index, 1);
                }}
              >
                ✕
              </button>
            {/if}
          </div>
          {#if index < block.children.length - 1}
            <div class="connector-line"></div>
          {/if}
        {/each}

        <button
          type="button"
          class="add-slot-btn"
          onclick={(e) => {
            stopProp(e);
            block.children.push(null);
          }}
        >
          + 新增條件
        </button>
      </div>
    {:else if block.category === "not"}
      <div class="c-body">
        {@render dropSlot(block.inner, (b) => (block.inner = b))}
      </div>
    {/if}
  </div>
{/snippet}

<!-- MAIN UI -->
<div class="app-layout">
  <!-- Toolbox (Left Sidebar) -->
  <aside
    class="toolbox-panel {isDraggingOverTrash ? 'trash-active' : ''}"
    ondragover={(e) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingOverTrash = true;
    }}
    ondragleave={() => (isDraggingOverTrash = false)}
    ondrop={handleTrashDrop}
  >
    <div class="sticky top-8">
      <div class="toolbox-header">
        <h2>方塊倉庫</h2>
        <p class="text-xs text-slate-400 mt-1">把方塊丟回來以銷毀</p>
      </div>

      <div class="template-list">
        {#each [{ cat: "scalar", label: "條件 (單項)", color: "bg-blue-500" }, { cat: "array", label: "條件 (列表)", color: "bg-emerald-500" }, { cat: "logical", label: "全部符合 / 任一符合", color: "bg-amber-500" }, { cat: "not", label: "不要", color: "bg-rose-500" }] as tmpl}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="template-block {tmpl.color}"
            draggable="true"
            ondragstart={(e) => {
              dragged = {
                isTemplate: true,
                category: tmpl.cat as Category,
                block: null,
              };
              if (e.dataTransfer) e.dataTransfer.setData("text/plain", tmpl.cat);
            }}
          >
            ⠿ {tmpl.label}
          </div>
        {/each}
      </div>
    </div>
  </aside>

  <!-- Workspace (Right Area) -->
  <main class="workspace-panel">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-slate-800">選課系統 <span class="text-zinc-400">(AI 生成的 UI 超爛但我懶得修了)</span></h1>
      <button class="run-btn" onclick={submitQuery} disabled={isLoading}>
        執行搜尋 ▶
      </button>
    </div>

    <div class="workspace-grid">
      <!-- Target Slot -->
      <div class="main-slot-wrapper">
        <h2 class="slot-label">目標條件</h2>
        <div class="root-drop-area">
          {@render dropSlot(rootSlot, (b) => (rootSlot = b), true)}
        </div>
      </div>

      <!-- Spare Blocks -->
      <div class="spare-slot-wrapper">
        <h2 class="slot-label">備用方塊區</h2>
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="spare-drop-area"
          ondragover={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("drag-active");
          }}
          ondragleave={(e) => e.currentTarget.classList.remove("drag-active")}
          ondrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("drag-active");
            if (!dragged) return;
            let b = dragged.isTemplate
              ? createBlock(dragged.category)
              : dragged.block!;
            if (!dragged.isTemplate) removeFromEverywhere(b.id);
            spareBlocks.push(b);
            dragged = null;
          }}
        >
          {#if spareBlocks.length === 0}
            <span class="placeholder">用不到的方塊可以放在這裡</span>
          {/if}
          {#each spareBlocks as sb (sb.id)}
            {@render blockNode(sb)}
          {/each}
        </div>
      </div>
    </div>

    <!-- Results Table -->
    <div class="results-container">
      <h2 class="font-bold text-slate-700 mb-2">
        查詢結果 <span class="badge">{results.length === 500 ? "只顯示前 500 項" : results.length}</span>
      </h2>
      {#if errorMsg}
        <div class="error-box">{errorMsg}</div>
      {/if}

      <div class="table-scroller">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 sticky top-0 text-slate-600 whitespace-nowrap">
            <tr>
              <th class="p-3">流水號 / 課號</th>
              <th class="p-3">標題</th>
              <th class="p-3">單位</th>
              <th class="p-3">學制</th>
              <th class="p-3">教師</th>
              <th class="p-3">必修</th>
              <th class="p-3">學分</th>
              <th class="p-3">時段 / 教室</th>
              <th class="p-3">語言</th>
              <th class="p-3">人數 / 上限 (+待分發)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-600">
            {#each results as row}
              <tr class="hover:bg-slate-50/50">
                <td class="p-3">{row.id}<br />{row.classNumber}</td>
                <td class="p-3 font-semibold">{row.title}</td>
                <td class="p-3 max-w-37.5">{row.department}</td>
                <td class="p-3">
                  {ENUMS.targetDegree[row.targetDegree]?.label}
                </td>
                <td class="p-3 max-w-37.5">
                  {row.teachers?.join(", ")}
                </td>
                <td class="p-3">
                  <div class="cursor-not-allowed">
                    <input class="pointer-events-none" type="checkbox" checked={row.required} />
                  </div>
                </td>
                <td class="p-3">{row.credits}</td>
                <td class="p-3">
                  {#each row.clocks as clock, i}
                    {ENUMS.clock.find(c => c.value === clock)?.label} | {row.classrooms[i]}<br />
                  {/each}
                </td>
                <td class="p-3">
                  {ENUMS.language.find(l => l.value === row.language)?.label}
                </td>
                <td class="p-3">{row.people.admitted} / {row.people.limit} (+{row.people.applying})</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </main>
</div>

<style lang="postcss">
  @reference "./layout.css";

  /* Base Layout */
  .app-layout {
    @apply min-h-screen bg-slate-100 p-3 flex flex-col lg:flex-row gap-2 font-sans text-slate-800 select-none;
    --drop-area-height: calc(100dvh - var(--spacing) * 180);
  }

  .toolbox-panel {
    @apply lg:w-64 bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent transition-all shrink-0;
  }
  .toolbox-panel.trash-active {
    @apply border-red-400 bg-red-50 scale-[1.02];
  }

  .workspace-panel {
    @apply flex-1 bg-white rounded-2xl p-6 shadow-sm flex flex-col min-h-[80vh];
  }

  /* Toolbox Items */
  .template-list {
    @apply flex flex-col gap-3 mt-4;
  }
  .template-block {
    @apply px-4 py-3 rounded-xl text-white font-medium shadow-sm cursor-grab active:cursor-grabbing hover:-translate-y-0.5 transition-transform;
  }

  /* Scratch Blocks Structure */
  .scratch-block {
    @apply w-max flex flex-col rounded-xl text-white shadow-md cursor-grab active:cursor-grabbing hover:shadow-lg transition-shadow border-b-4 shrink-0;
  }
  .block-header {
    @apply flex items-center gap-2 px-3 py-2 rounded-t-xl min-h-11;
  }

  /* Logical specific */
  .scratch-block.logical,
  .scratch-block.not {
    @apply rounded-bl-none;
  }
  .c-body {
    @apply flex flex-col gap-2 p-2 pl-4 border-l-[6px] rounded-br-lg bg-black/20;
  }
  .connector-line {
    @apply h-0.5 bg-white/30 ml-2 w-4 shrink-0;
  }

  /* Dynamic slots buttons */
  .add-slot-btn {
    @apply text-xs bg-white/15 hover:bg-white/25 active:scale-95 text-white font-medium py-1 px-2.5 rounded-lg border border-white/20 transition-all cursor-pointer w-full mt-1;
  }
  .remove-slot-btn {
    @apply text-white/50 hover:text-white hover:bg-black/20 rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0;
  }

  /* Block Colors */
  .scalar {
    @apply bg-blue-500 border-blue-700;
  }
  .scalar > .block-header {
    @apply bg-blue-500 rounded-xl;
  }

  .array {
    @apply bg-emerald-500 border-emerald-700;
  }
  .array > .block-header {
    @apply bg-emerald-500 rounded-xl;
  }

  .logical {
    @apply bg-amber-500 border-amber-700;
  }
  .logical > .block-header {
    @apply bg-amber-500;
  }
  .logical > .c-body {
    @apply border-amber-600;
  }

  .not {
    @apply bg-rose-500 border-rose-700;
  }
  .not > .block-header {
    @apply bg-rose-500;
  }
  .not > .c-body {
    @apply border-rose-600;
  }

  /* Block Inputs */
  .input-light {
    @apply bg-black/20 text-white border border-white/20 rounded-lg px-2 py-1 text-sm outline-none focus:bg-black/30 focus:border-white/50 cursor-pointer;
  }
  .input-light option {
    @apply bg-white text-slate-800;
  }
  .input-bold {
    @apply bg-transparent text-white border-none outline-none cursor-pointer;
  }
  .input-bold option {
    @apply bg-white text-slate-800 text-base;
  }

  /* Drop Slots */
  .workspace-grid {
    @apply grid xl:grid-cols-2 gap-8 mb-6;
  }
  .slot-label {
    @apply font-bold text-slate-600 mb-2 uppercase tracking-wide text-xs;
  }

  .drop-slot {
    @apply min-w-50 min-h-12.5 rounded-xl transition-all border-2 border-transparent shrink-0;
  }
  .drop-slot.empty {
    @apply bg-black/10 border-dashed border-black/20 flex items-center justify-center;
  }
  .drop-slot.drag-active {
    @apply border-white/60 bg-white/20 scale-[1.02];
  }

  .root-drop-area {
    @apply p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 min-h-50 overflow-auto;
    height: var(--drop-area-height);
  }
  .drop-slot.is-root.empty {
    @apply bg-slate-200 border-slate-300;
    height: calc(var(--drop-area-height) - var(--spacing) * 13);
  }
  .root-drop-area .drop-slot.drag-active {
    @apply border-blue-400 bg-blue-100;
  }

  .spare-drop-area {
    @apply flex flex-wrap gap-4 p-4 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 min-h-50 items-start content-start overflow-y-auto;
    height: var(--drop-area-height);
  }
  .spare-drop-area.drag-active {
    @apply border-amber-400 bg-amber-50;
  }

  .placeholder {
    @apply text-xs font-semibold text-black/40 uppercase tracking-widest pointer-events-none;
  }

  /* Misc UI */
  .run-btn {
    @apply bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all shadow-md;
  }
  .badge {
    @apply bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold;
  }
  .error-box {
    @apply bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium border border-red-100;
  }

  .table-scroller {
    @apply max-h-124 overflow-auto rounded-xl border border-slate-200 shadow-inner bg-white;
  }
</style>
