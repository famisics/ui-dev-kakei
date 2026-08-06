"use client";

import {
  ResponsiveContainer,
  Sankey,
  type SankeyLinkProps,
  type SankeyNodeProps,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatYen } from "@/features/kakei/lib/format";
import type {
  CashFlowCategory,
  CategoryCashFlow as CategoryCashFlowData,
} from "@/features/kakei/lib/summary";

type FlowNode = {
  name: string;
  detail: string;
  color: string;
  kind: "category" | "root" | "savings" | "scaffold";
};

type FlowLink = {
  source: number;
  target: number;
  value: number;
  color: string;
  hidden?: boolean;
};

const incomeColor = "var(--income)";
const expenseColor = "var(--expense)";
const rootColor = "var(--muted-foreground)";

function buildChartData(flow: CategoryCashFlowData) {
  const nodes: FlowNode[] = [];
  const links: FlowLink[] = [];
  const addNode = (node: FlowNode) => nodes.push(node) - 1;
  const rootIndex = addNode({
    name: "収支",
    detail: formatYen(Math.max(flow.incomeTotal, flow.expenseTotal)),
    color: rootColor,
    kind: "root",
  });

  const addSide = (groups: CashFlowCategory[], type: "income" | "expense") => {
    for (const group of groups) {
      const groupColor = type === "income" ? incomeColor : expenseColor;
      const parentIndex = addNode({
        name: group.name,
        detail: `${formatYen(group.total)} · ${(group.ratio * 100).toFixed(1)}%`,
        color: groupColor,
        kind: "category",
      });

      links.push(
        type === "income"
          ? {
              source: parentIndex,
              target: rootIndex,
              value: group.total,
              color: groupColor,
            }
          : {
              source: rootIndex,
              target: parentIndex,
              value: group.total,
              color: groupColor,
            },
      );

      for (const child of group.children) {
        const childIndex = addNode({
          name: child.name,
          detail: `${formatYen(child.total)} · ${(child.ratio * 100).toFixed(1)}%`,
          color: groupColor,
          kind: "category",
        });
        links.push(
          type === "income"
            ? {
                source: childIndex,
                target: parentIndex,
                value: child.total,
                color: groupColor,
              }
            : {
                source: parentIndex,
                target: childIndex,
                value: child.total,
                color: groupColor,
              },
        );
      }
    }
  };

  addSide(flow.income, "income");
  addSide(flow.expense, "expense");

  const difference = flow.incomeTotal - flow.expenseTotal;
  if (difference !== 0) {
    const amount = Math.abs(difference);
    const savingsIndex = addNode({
      name: difference > 0 ? "貯蓄" : "貯蓄（取崩し）",
      detail: formatYen(amount),
      color: rootColor,
      kind: "savings",
    });
    const scaffoldIndex = addNode({
      name: "",
      detail: "",
      color: "transparent",
      kind: "scaffold",
    });

    if (difference > 0) {
      links.push(
        {
          source: rootIndex,
          target: savingsIndex,
          value: amount,
          color: rootColor,
        },
        {
          source: savingsIndex,
          target: scaffoldIndex,
          value: amount,
          color: "transparent",
          hidden: true,
        },
      );
    } else {
      links.push(
        {
          source: scaffoldIndex,
          target: savingsIndex,
          value: amount,
          color: "transparent",
          hidden: true,
        },
        {
          source: savingsIndex,
          target: rootIndex,
          value: amount,
          color: rootColor,
        },
      );
    }
  }

  return { nodes, links };
}

function renderNode(nodes: FlowNode[]) {
  return ({ x, y, width, height, index }: SankeyNodeProps) => {
    const node = nodes[index];
    if (node.kind === "scaffold") return null;
    const isRoot = node.kind === "root";
    const isLeft = x < 400;
    const labelX = isRoot ? x + width / 2 : isLeft ? x - 8 : x + width + 8;
    const textAnchor = isRoot ? "middle" : isLeft ? "end" : "start";
    const labelY = isRoot ? y - 20 : y + Math.max(height / 2 - 7, 5);

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={Math.max(height, 1)}
          rx={2}
          fill={node.color}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor={textAnchor}
          className="fill-foreground text-[12px] font-medium"
        >
          <tspan x={labelX}>{node.name}</tspan>
          <tspan
            x={labelX}
            dy="1.25em"
            className="fill-muted-foreground text-[10px]"
          >
            {node.detail}
          </tspan>
        </text>
      </g>
    );
  };
}

function renderLink(links: FlowLink[]) {
  return ({
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    index,
  }: SankeyLinkProps) => {
    const link = links[index];
    const path = `M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`;

    return (
      <path
        d={path}
        fill="none"
        stroke={link.color}
        strokeWidth={Math.max(linkWidth, 0.75)}
        strokeOpacity={link.hidden ? 0 : 0.18}
        className="transition-[stroke-opacity] hover:stroke-opacity-35"
      />
    );
  };
}

export function CategoryCashFlow({ flow }: { flow: CategoryCashFlowData }) {
  const hasTransactions = flow.incomeTotal > 0 || flow.expenseTotal > 0;
  const chartData = buildChartData(flow);
  const leafCount = Math.max(
    flow.income.reduce((count, group) => count + group.children.length, 0),
    flow.expense.reduce((count, group) => count + group.children.length, 0),
  );
  const chartHeight = Math.max(360, leafCount * 44);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>ジャンル別収支</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasTransactions ? (
          <p className="text-sm text-muted-foreground">
            この月の収支はまだ登録されていません。
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-4xl" style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <Sankey
                  data={chartData}
                  node={renderNode(chartData.nodes)}
                  link={renderLink(chartData.links)}
                  nodeWidth={12}
                  nodePadding={24}
                  linkCurvature={0.55}
                  iterations={48}
                  margin={{ top: 44, right: 150, bottom: 20, left: 150 }}
                  title="ジャンル別収支"
                  desc="中央の収支から、親ジャンル、小ジャンルの順に金額の流れを示します。"
                >
                  <Tooltip
                    formatter={(value) => formatYen(Number(value))}
                    contentStyle={{
                      borderRadius: "var(--radius)",
                      borderColor: "var(--border)",
                      background: "var(--popover)",
                      color: "var(--popover-foreground)",
                    }}
                  />
                </Sankey>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
