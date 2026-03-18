export interface MCPServerConfig {
  name: string
  url: string
  headers?: Record<string, string>
}

export const MCP_SERVERS: MCPServerConfig[] = process.env.WINDOWS_MCP_URL
  ? [{ name: 'windows-mcp', url: process.env.WINDOWS_MCP_URL }]
  : []
