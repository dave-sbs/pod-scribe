### - Update: April 6, 2026

## WIP: Data Fetching Architecture
1. I could set up a deep research architecture. Current search results surface relevant results but they don't go deep into the 'meat' of the content. Deep research would have a system to fetch nearby chunks for each high-scoring chunk & send for LLM synthesis. Additionally, instead of a one-go fetch, we would have a multi-step synthesis and building of the response. Using sub-agents and a supervisor. 
2. I'm curious about how RAG would compare to the newer approaches of using filesystems with an index.md and then using that as the source of content and then still applying the deep research architecture.


### Small Wins
1. Zod validation for the data types. Help us secure the data and catch errors early on.
