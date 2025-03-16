# intro
JS AI chat app to help users develop software where:

- users bring their own keys
- there is a config table to add as many connections as they want: base url, api key
- models are presented in another table, and get from `base_url/models` in openai format
- all app tables derive from the same code, see [Table Code](#table-code)
- all configs are stored in DB, no env vars, and can be changed by admin in a web UI
- sensitive configs should be shown only the first and last part with *** in the middle
- user can set a default AI model to chat with
- there is a document mode, where instead of chat, a collaborative document can be edited by several people or AIs
- user can CRUD and share system prompts, and assign them to a chat
- user can ask AI to replicate teams of agents and make them create and run workflows(graph of contexts)

# table code
Should allow filtering and sorting on each column, pagination, grouping, export import(overwrite, append), create, update, delete, batch actions, columns and rows freezing, saved queries or views, calculated columns, joins, 2 way data binding

```js
tableFor(url_or_array, config = {})
```
# system prompts

## prompt 1

Start writing tests automating browser, after user is happy with the result, only then start implementing. Implement until all tests pass.