<script lang="ts">
  import { Degree } from "@ncu-courses/shared/types/database";
  import { MatchOp, type QueryNode } from "@ncu-courses/shared/types/query";

  async function test() {
    const payload = {
      limit: 20,
      offset: 0,
      filter: {
        and: [
          {
            field: "people_applying",
            match: {
              op: MatchOp.LT,
              value: 5,
            },
          },
          {
            field: "classrooms",
            op: "any",
            each: {
              op: MatchOp.INCLUDES,
              value: "工程五館",
            },
          },
        ],
      } satisfies QueryNode,
    };

    const res = await fetch("/ncu-courses/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Request failed (${res.status}): ${errorData.message}`);
    }

    const data = await res.json();
    console.log("Query Results:", data);
  }
</script>

<button onclick={test}> Test </button>
