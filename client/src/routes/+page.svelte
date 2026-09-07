<script lang="ts">
    import { Degree } from "@ncu-courses/shared/types/database";
  import { type QueryNode } from "@ncu-courses/shared/types/query";

  async function test() {
    const payload = {
      limit: 200,
      offset: 0,
      filter: {
        and: [{
          field: "targetDegree",
          op: "eq",
          value: Degree.BACHELOR,
        }, {
          field: "credits",
          op: "gte",
          value: 3,
        }]
      } satisfies QueryNode
    };

    const res = await fetch("api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        `Request failed (${res.status}): ${errorData.message}`,
      );
    }

    const data = await res.json();
    console.log("Query Results:", data);
  }
</script>

<svelte:head>
  <title>中央大學破爛系統超可憐</title>
</svelte:head>

<button onclick={test}> Test </button>
