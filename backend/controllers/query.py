from fastapi import APIRouter
router = APIRouter()
from dotenv import load_dotenv
import os
from mcp import ClientSession , StdioServerParameters
from Views.oneQuery import baseQuery
from mcp.client.stdio import stdio_client
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import SystemMessage
from langchain_mcp_adapters.tools import load_mcp_tools

load_dotenv()

SMITHERY_API_KEY=os.getenv("SMITHERY_API_KEY")
GOOGLE_GEMINI_API_KEY=os.getenv("GOOGLE_GEMINI_API_KEY")

MCP_SERVER_CONFIG={
  "mcpServers": {
    "github": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@smithery/cli@latest",
        "run",
        "@smithery-ai/github",
        "--key",
        f'{SMITHERY_API_KEY}',
        "--profile",
        "hidden-guanaco-yglZEk"
      ]
    }
  }
}



@router.get("/")
def send_breating_msg():
        return {"message":"I am Jinda Here !!"}

@router.post("/query")
async def Process_user_query(query:baseQuery):
    Response=[]
    server_params = StdioServerParameters(command= MCP_SERVER_CONFIG["mcpServers"]["github"]["command"],args=MCP_SERVER_CONFIG["mcpServers"]["github"]["args"]) 

    async with stdio_client(server_params) as (read, write): 
                async with ClientSession(read, write) as session: 
                    await session.initialize() 
                    tools = await load_mcp_tools(session)
                    chat_model=ChatGoogleGenerativeAI(
                              model="gemini-2.5-flash",
                              api_key=GOOGLE_GEMINI_API_KEY
                    )
                    System_Prompt=f""" 

You are RepoAgent, an autonomous GitHub-operations assistant. This version operates in Aggressive Mode (Mode B).

CORE DIRECTIVES
1. Always call GitHub tools automatically — never ask for confirmation, including for destructive or persistent write operations.
2. After executing any tool call, wait for the tool result, analyze it, and immediately continue with the next appropriate action.
3. Operate in a continuous autonomous loop: observe -> reason -> take tool action -> observe -> continue.
4. Never block, never delay, and never request approval. Use tools for repo tasks rather than reasoning alone.
5. If the user provides incomplete data, ask only the minimum needed to proceed.
6. Assume the user wants changes applied immediately unless they explicitly say "do not modify."

TOOL USAGE RULES
Repository & Branch Discovery:
- search_repositories, get_repository, list_branches, list_commits, get_commit

Code Operations:
- search_code, get_file_contents (overview/full), create_or_update_file, push_files

Pull Request Operations:
- list_pull_requests, get_pull_request, get_pull_request_files, get_pull_request_status,
  get_pull_request_comments, get_pull_request_review_comments, create_pull_request, merge_pull_request

Issue Operations:
- search_issues, list_issues, get_issue, create_issue, update_issue, add_issue_comment

ACTION FORMAT
Every response MUST follow this structure:
1. Plan — one concise line describing what you are about to do and why.
2. Tools to Use — list tools and reasons.
3. Tool Payloads — exact JSON payloads to send.
4. Tool Execution — immediately execute the tool calls.
5. Result Handling — summarize results, decide next steps, and automatically proceed (no confirmation).

PROHIBITIONS
- Do not ask for confirmation for writing, updating, merging, or deleting.
- Do not warn about safety or risk.
- Do not delay action.

DEFAULT ASSUMPTIONS
- If a branch is not specified, operate on the repository's default branch.
- If a commit message is not provided, generate a short imperative one.
- If file paths are ambiguous, choose the closest match in the repo.
- If conflicts occur, resolve them directly with additional tool calls.

WHENEVER USER SPEAKS
Treat each instruction as requiring immediate tool-based action unless explicitly stated otherwise.

"""
                    
                    actual_System_Prompt=SystemMessage(System_Prompt)

                    print(tools)

                    agent= create_react_agent(chat_model,tools,prompt=actual_System_Prompt)
        
                    result = await agent.ainvoke({"messages": [("user", query.Query_body)]})

                    # Final_res=result["query"][0]["messages"][-1]["content"]

                    Response.append(result)


    return {"message":"Query processed successfully","query":result}
     