"use client";

import { FormEvent, useMemo, useState } from "react";

type AgentState = "working" | "reviewing" | "idle" | "blocked";
type TaskStatus = "inbox" | "working" | "review" | "paused" | "done";

type Agent = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  state: AgentState;
  tokenUsed: number;
  tokenBudget: number;
  sprite: number;
  position: { left: string; top: string };
  color: string;
};

type Task = {
  id: string;
  title: string;
  detail: string;
  status: TaskStatus;
  progress: number;
  priority: "high" | "medium" | "low";
  assigneeId: string | null;
  tokenUsed: number;
  tokenBudget: number;
  source: "measured" | "estimated" | "simulated";
};

const agents: Agent[] = [
  {
    id: "manager",
    name: "Mochi",
    role: "專案總管",
    specialty: "拆解、派工、整合",
    state: "working",
    tokenUsed: 18_400,
    tokenBudget: 30_000,
    sprite: 0,
    position: { left: "45%", top: "33%" },
    color: "#4f76d9",
  },
  {
    id: "researcher",
    name: "Kumo",
    role: "資料研究員",
    specialty: "搜尋、來源、證據",
    state: "working",
    tokenUsed: 21_800,
    tokenBudget: 32_000,
    sprite: 1,
    position: { left: "19%", top: "37%" },
    color: "#47a89b",
  },
  {
    id: "analyst",
    name: "Sora",
    role: "分析員",
    specialty: "財務、情境、推論",
    state: "blocked",
    tokenUsed: 17_100,
    tokenBudget: 20_000,
    sprite: 2,
    position: { left: "31%", top: "65%" },
    color: "#8e78bd",
  },
  {
    id: "builder",
    name: "Bolt",
    role: "執行員",
    specialty: "程式、文件、成品",
    state: "working",
    tokenUsed: 24_200,
    tokenBudget: 40_000,
    sprite: 3,
    position: { left: "62%", top: "65%" },
    color: "#d37a42",
  },
  {
    id: "reviewer",
    name: "Echo",
    role: "審查員",
    specialty: "查錯、風險、驗收",
    state: "reviewing",
    tokenUsed: 9_600,
    tokenBudget: 18_000,
    sprite: 4,
    position: { left: "78%", top: "39%" },
    color: "#ad5362",
  },
];

const initialTasks: Task[] = [
  {
    id: "industry-map",
    title: "AI 伺服器產業地圖",
    detail: "整理供應鏈瓶頸與公司對照",
    status: "working",
    progress: 68,
    priority: "high",
    assigneeId: "researcher",
    tokenUsed: 21_800,
    tokenBudget: 32_000,
    source: "simulated",
  },
  {
    id: "earnings-model",
    title: "財報驚喜模型更新",
    detail: "檢查日本市場事件視窗",
    status: "working",
    progress: 54,
    priority: "high",
    assigneeId: "analyst",
    tokenUsed: 17_100,
    tokenBudget: 20_000,
    source: "simulated",
  },
  {
    id: "agent-ui",
    title: "Agent Room 視覺原型",
    detail: "完成辦公室與任務互動",
    status: "working",
    progress: 42,
    priority: "medium",
    assigneeId: "builder",
    tokenUsed: 24_200,
    tokenBudget: 40_000,
    source: "simulated",
  },
  {
    id: "source-review",
    title: "來源可信度審查",
    detail: "抽查引用與推論是否一致",
    status: "review",
    progress: 86,
    priority: "medium",
    assigneeId: "reviewer",
    tokenUsed: 9_600,
    tokenBudget: 18_000,
    source: "simulated",
  },
  {
    id: "daily-brief",
    title: "每日市場 Brief",
    detail: "等待派給合適的 Agent",
    status: "inbox",
    progress: 0,
    priority: "low",
    assigneeId: null,
    tokenUsed: 0,
    tokenBudget: 12_000,
    source: "estimated",
  },
];

const stateLabels: Record<AgentState, string> = {
  working: "執行中",
  reviewing: "審查中",
  idle: "待命",
  blocked: "需要協助",
};

const statusLabels: Record<TaskStatus, string> = {
  inbox: "待派工",
  working: "進行中",
  review: "待審查",
  paused: "已暫停",
  done: "已完成",
};

function formatTokens(value: number) {
  return value >= 1_000 ? `${(value / 1_000).toFixed(1)}k` : `${value}`;
}

function usageTone(used: number, budget: number) {
  const ratio = budget ? used / budget : 0;
  if (ratio >= 0.9) return "critical";
  if (ratio >= 0.85) return "protect";
  if (ratio >= 0.75) return "throttle";
  if (ratio >= 0.6) return "watch";
  return "normal";
}

function TokenMeter({ used, budget, compact = false }: { used: number; budget: number; compact?: boolean }) {
  const percent = Math.min(100, Math.round((used / Math.max(1, budget)) * 100));
  const tone = usageTone(used, budget);
  return (
    <div className={`tokenMeter ${compact ? "compact" : ""}`} data-tone={tone}>
      <div className="tokenTrack" aria-label={`Token 使用率 ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {!compact && (
        <div className="tokenMeta">
          <span>{formatTokens(used)} / {formatTokens(budget)}</span>
          <strong>{percent}%</strong>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedAgentId, setSelectedAgentId] = useState("manager");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [notice, setNotice] = useState("模擬模式：目前所有 token 數據皆為展示資料");

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const agentTask = tasks.find((task) => task.assigneeId === selectedAgent.id && task.status !== "done") ?? null;

  const totals = useMemo(
    () => tasks.reduce(
      (result, task) => ({ used: result.used + task.tokenUsed, budget: result.budget + task.tokenBudget }),
      { used: 0, budget: 0 },
    ),
    [tasks],
  );

  function selectAgent(agentId: string) {
    if (selectedTaskId) {
      assignTask(selectedTaskId, agentId);
      return;
    }
    setSelectedAgentId(agentId);
    setInspectorOpen(true);
  }

  function assignTask(taskId: string, agentId: string) {
    const agent = agents.find((item) => item.id === agentId);
    setTasks((current) => current.map((task) => (
      task.id === taskId
        ? { ...task, assigneeId: agentId, status: "working", progress: Math.max(task.progress, 6) }
        : task
    )));
    setSelectedTaskId(null);
    setSelectedAgentId(agentId);
    setInspectorOpen(true);
    setNotice(`已把任務交給 ${agent?.name ?? "Agent"}，小精靈開始工作了`);
  }

  function updateTask(taskId: string, status: TaskStatus) {
    setTasks((current) => current.map((task) => (
      task.id === taskId
        ? { ...task, status, progress: status === "done" ? 100 : task.progress }
        : task
    )));
    setNotice(status === "done" ? "成果已驗收並歸檔" : status === "review" ? "成果已送進審查室" : "任務狀態已更新");
  }

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    setTasks((current) => [
      ...current,
      {
        id: `task-${Date.now()}`,
        title,
        detail: String(data.get("detail") ?? "等待專案總管拆解"),
        status: "inbox",
        progress: 0,
        priority: String(data.get("priority")) as Task["priority"],
        assigneeId: null,
        tokenUsed: 0,
        tokenBudget: Number(data.get("budget")) || 12_000,
        source: "estimated",
      },
    ]);
    setNewTaskOpen(false);
    setNotice("新任務已放進派工匣，點選任務後再點小精靈即可指派");
  }

  return (
    <main className="appShell">
      <header className="topBar">
        <div className="brandBlock">
          <div className="brandMark" aria-hidden="true"><span /><span /><span /></div>
          <div>
            <p>AGENT CONTROL ROOM</p>
            <h1>Agent Room</h1>
          </div>
          <span className="simBadge"><i /> SIMULATION</span>
        </div>

        <div className="headerStats">
          <div className="miniStat"><span>Agents</span><strong>5</strong><small>4 active</small></div>
          <div className="miniStat"><span>Tasks</span><strong>{tasks.filter((task) => task.status !== "done").length}</strong><small>{tasks.filter((task) => task.status === "review").length} review</small></div>
          <div className="budgetStat">
            <div><span>Project token budget</span><strong>{Math.round((totals.used / totals.budget) * 100)}%</strong></div>
            <TokenMeter used={totals.used} budget={totals.budget} compact />
            <small>模擬數據 · 距節流門檻 14%</small>
          </div>
        </div>

        <button className="iconButton" aria-label="開啟設定"><span>•••</span></button>
      </header>

      <section className="commandStrip" aria-live="polite">
        <span className="commandIcon">◆</span>
        <p>{notice}</p>
        {selectedTaskId ? (
          <button onClick={() => setSelectedTaskId(null)}>取消派工</button>
        ) : (
          <span className="commandHint">點任務，再點 Agent 即可派工</span>
        )}
      </section>

      <div className="workspaceGrid">
        <section className="officePanel" aria-label="Agent 辦公室">
          <div className="officeToolbar">
            <div>
              <span className="liveDot" />
              <strong>辦公室運作中</strong>
              <small>5 名成員在線</small>
            </div>
            <div className="viewControls" aria-label="辦公室檢視控制">
              <button aria-label="縮小">−</button>
              <button aria-label="重設檢視">⌂</button>
              <button aria-label="放大">＋</button>
            </div>
          </div>

          <div className="officeViewport">
            <img className="officeBackground" src="/assets/office-background.png" alt="俯視角 2D 像素辦公室" />

            <div className="zoneTag zoneDispatch"><span>◆</span> 派工台</div>
            <div className="zoneTag zoneResearch"><span>▦</span> 資料室</div>
            <div className="zoneTag zoneAnalysis"><span>◫</span> 分析區</div>
            <div className="zoneTag zoneBuild"><span>▣</span> 製作區</div>
            <div className="zoneTag zoneReview"><span>✓</span> 審查室</div>

            {agents.map((agent) => {
              const currentTask = tasks.find((task) => task.assigneeId === agent.id && task.status !== "done");
              const dropReady = Boolean(selectedTaskId);
              return (
                <button
                  key={agent.id}
                  className={`agentUnit ${agent.state} ${selectedAgentId === agent.id ? "selected" : ""} ${dropReady ? "dropReady" : ""}`}
                  style={{ left: agent.position.left, top: agent.position.top, "--agent-color": agent.color } as React.CSSProperties}
                  onClick={() => selectAgent(agent.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const taskId = event.dataTransfer.getData("text/task-id");
                    if (taskId) assignTask(taskId, agent.id);
                  }}
                  aria-label={`${agent.name}，${agent.role}，${stateLabels[agent.state]}`}
                >
                  {agent.state === "blocked" && <span className="agentAlert">!</span>}
                  {agent.state === "reviewing" && <span className="agentBubble">✓</span>}
                  <span
                    className="spriteFrame"
                    style={{ backgroundImage: `url("/assets/agent-${agent.sprite}.png")` }}
                    aria-hidden="true"
                  />
                  <span className="agentPlate">
                    <span><b>{agent.name}</b><i data-state={agent.state} /></span>
                    <small>{currentTask?.title ?? "等待新任務"}</small>
                  </span>
                  <span className="agentProgress"><i style={{ width: `${currentTask?.progress ?? 12}%` }} /></span>
                </button>
              );
            })}

            <div className="officeLegend">
              <span><i className="legendWorking" />執行中</span>
              <span><i className="legendReview" />審查中</span>
              <span><i className="legendBlocked" />需要協助</span>
            </div>
          </div>
        </section>

        <aside className={`inspector ${inspectorOpen ? "open" : ""}`}>
          <div className="inspectorHeader">
            <div className="avatarMini" style={{ "--sprite-index": selectedAgent.sprite } as React.CSSProperties}>
              <span style={{ backgroundImage: `url("/assets/agent-${selectedAgent.sprite}.png")` }} />
            </div>
            <div>
              <span className="eyebrow">AGENT DETAILS</span>
              <h2>{selectedAgent.name}</h2>
              <p>{selectedAgent.role}</p>
            </div>
            <button onClick={() => setInspectorOpen(false)} aria-label="關閉 Agent 詳情">×</button>
          </div>

          <div className="statusRow">
            <span data-state={selectedAgent.state}>{stateLabels[selectedAgent.state]}</span>
            <small>{selectedAgent.specialty}</small>
          </div>

          <section className="inspectorSection">
            <div className="sectionTitle"><span>目前任務</span><small>{agentTask ? statusLabels[agentTask.status] : "待命"}</small></div>
            {agentTask ? (
              <div className="focusTask">
                <h3>{agentTask.title}</h3>
                <p>{agentTask.detail}</p>
                <div className="progressHeader"><span>完成進度</span><strong>{agentTask.progress}%</strong></div>
                <div className="progressTrack"><i style={{ width: `${agentTask.progress}%` }} /></div>
                <div className="taskActions">
                  <button onClick={() => updateTask(agentTask.id, agentTask.status === "paused" ? "working" : "paused")}>
                    {agentTask.status === "paused" ? "繼續" : "暫停"}
                  </button>
                  <button className="primary" onClick={() => updateTask(agentTask.id, "review")}>送審</button>
                </div>
              </div>
            ) : (
              <div className="emptyState">這名 Agent 正在待命，可從下方任務匣派工。</div>
            )}
          </section>

          <section className="inspectorSection tokenSection">
            <div className="sectionTitle"><span>Token 使用</span><small>SIMULATED</small></div>
            <TokenMeter used={agentTask?.tokenUsed ?? selectedAgent.tokenUsed} budget={agentTask?.tokenBudget ?? selectedAgent.tokenBudget} />
            <div className="tokenFacts">
              <div><span>本任務已用</span><strong>{formatTokens(agentTask?.tokenUsed ?? selectedAgent.tokenUsed)}</strong></div>
              <div><span>預估剩餘</span><strong>{formatTokens(Math.max(0, (agentTask?.tokenBudget ?? selectedAgent.tokenBudget) - (agentTask?.tokenUsed ?? selectedAgent.tokenUsed)))}</strong></div>
            </div>
            <p className="meterNote">此處展示任務預算，不代表帳戶真實剩餘額度。</p>
          </section>

          <section className="inspectorSection activitySection">
            <div className="sectionTitle"><span>最近動態</span><button>查看全部</button></div>
            <ol>
              <li><i />完成資料來源交叉確認<time>2 分鐘前</time></li>
              <li><i />專案總管調整優先級<time>8 分鐘前</time></li>
              <li><i />建立工作 checkpoint<time>14 分鐘前</time></li>
            </ol>
          </section>
        </aside>
      </div>

      <section className="taskDock" aria-label="任務匣">
        <div className="dockHeader">
          <div><span className="dockIcon">▰</span><strong>任務匣</strong><small>{tasks.length} 張任務卡</small></div>
          <button className="newTaskButton" onClick={() => setNewTaskOpen(true)}>＋ 新任務</button>
        </div>
        <div className="taskScroller">
          {tasks.map((task) => {
            const assignee = agents.find((agent) => agent.id === task.assigneeId);
            return (
              <button
                key={task.id}
                className={`taskCard ${selectedTaskId === task.id ? "selected" : ""}`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/task-id", task.id);
                  setSelectedTaskId(task.id);
                }}
                onClick={() => {
                  setSelectedTaskId(selectedTaskId === task.id ? null : task.id);
                  setNotice(selectedTaskId === task.id ? "已取消派工" : `已選取「${task.title}」，現在點一名 Agent 指派`);
                }}
              >
                <span className="taskCardTop">
                  <span className={`priority ${task.priority}`}>{task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}</span>
                  <span className={`taskStatus ${task.status}`}>{statusLabels[task.status]}</span>
                </span>
                <strong>{task.title}</strong>
                <small>{task.detail}</small>
                <span className="taskCardBottom">
                  <span className="assigneeDot" style={{ background: assignee?.color ?? "#596273" }}>{assignee?.name ?? "未指派"}</span>
                  <span>{task.progress}%</span>
                </span>
                <span className="cardProgress"><i style={{ width: `${task.progress}%` }} /></span>
              </button>
            );
          })}
        </div>
      </section>

      {newTaskOpen && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setNewTaskOpen(false)}>
          <form className="taskModal" onSubmit={createTask} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div><span>NEW MISSION</span><h2>建立新任務</h2></div>
              <button type="button" onClick={() => setNewTaskOpen(false)} aria-label="關閉">×</button>
            </div>
            <label>任務名稱<input name="title" autoFocus required placeholder="例如：研究記憶體產業供需" /></label>
            <label>預期成果<textarea name="detail" rows={3} placeholder="說明你希望 Agent 最後交付什麼" /></label>
            <div className="formRow">
              <label>優先級<select name="priority" defaultValue="medium"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
              <label>Token 預算<input name="budget" type="number" min="1000" step="1000" defaultValue="12000" /></label>
            </div>
            <p className="formHint">建立後會先進入任務匣，由你點選 Agent 派工。</p>
            <button className="submitTask" type="submit">放進任務匣</button>
          </form>
        </div>
      )}
    </main>
  );
}
