"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Layers, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Floor = {
  id: string;
  name: string;
  sort_order: number;
};

type Block = {
  id: string;
  floor_id: string | null;
  name: string;
  color: string;
  sort_order: number;
};

type Props = {
  facilityId: string;
  floors: Floor[];
  blocks: Block[];
};

const BLOCK_COLORS = [
  "#059669", "#2563eb", "#9333ea", "#dc2626",
  "#d97706", "#0891b2", "#be185d", "#65a30d",
];

export default function BlocksSettings({ facilityId, floors: initialFloors, blocks: initialBlocks }: Props) {
  const router = useRouter();
  const [floors, setFloors]   = useState(initialFloors);
  const [blocks, setBlocks]   = useState(initialBlocks);
  const [saving, setSaving]   = useState(false);

  // ── フロア ──────────────────────────────────────────
  const [newFloorName, setNewFloorName] = useState("");

  const addFloor = async () => {
    if (!newFloorName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("floors")
      .insert({ facility_id: facilityId, name: newFloorName.trim(), sort_order: floors.length })
      .select()
      .single();
    if (error) { toast.error("フロアの追加に失敗しました"); }
    else { setFloors(prev => [...prev, data]); setNewFloorName(""); toast.success("フロアを追加しました"); }
    setSaving(false);
  };

  const deleteFloor = async (id: string) => {
    if (!window.confirm("このフロアを削除しますか？関連ブロックのフロア割り当ては解除されます。")) return;
    const supabase = createClient();
    const { error } = await supabase.from("floors").delete().eq("id", id);
    if (error) { toast.error("削除に失敗しました"); return; }
    setFloors(prev => prev.filter(f => f.id !== id));
    setBlocks(prev => prev.map(b => b.floor_id === id ? { ...b, floor_id: null } : b));
    toast.success("フロアを削除しました");
  };

  // ── ブロック ─────────────────────────────────────────
  const [newBlock, setNewBlock] = useState({ name: "", floor_id: "" as string | null, color: BLOCK_COLORS[0] });

  const addBlock = async () => {
    if (!newBlock.name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("blocks")
      .insert({
        facility_id: facilityId,
        floor_id: newBlock.floor_id || null,
        name: newBlock.name.trim(),
        color: newBlock.color,
        sort_order: blocks.length,
      })
      .select()
      .single();
    if (error) { toast.error("ブロックの追加に失敗しました"); }
    else {
      setBlocks(prev => [...prev, data]);
      setNewBlock({ name: "", floor_id: null, color: BLOCK_COLORS[blocks.length % BLOCK_COLORS.length] });
      toast.success("ブロックを追加しました");
      router.refresh();
    }
    setSaving(false);
  };

  const deleteBlock = async (id: string) => {
    if (!window.confirm("このブロックを削除しますか？ブロック内のシフトデータも削除されます。")) return;
    const supabase = createClient();
    const { error } = await supabase.from("blocks").delete().eq("id", id);
    if (error) { toast.error("削除に失敗しました"); return; }
    setBlocks(prev => prev.filter(b => b.id !== id));
    toast.success("ブロックを削除しました");
    router.refresh();
  };

  const updateBlockFloor = async (blockId: string, floorId: string | null) => {
    const supabase = createClient();
    const { error } = await supabase.from("blocks").update({ floor_id: floorId }).eq("id", blockId);
    if (error) { toast.error("更新に失敗しました"); return; }
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, floor_id: floorId } : b));
  };

  return (
    <div className="space-y-6">
      {/* フロア管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <CardTitle>フロア管理</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 既存フロア一覧 */}
          {floors.length > 0 && (
            <div className="space-y-2">
              {floors.map(f => (
                <div key={f.id} className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50">
                  <span className="text-sm font-medium">{f.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {blocks.filter(b => b.floor_id === f.id).length}ブロック
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFloor(f.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* フロア追加 */}
          <div className="flex gap-2">
            <Input
              placeholder="フロア名（例: 1階、A棟2F）"
              value={newFloorName}
              onChange={e => setNewFloorName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addFloor(); }}
              className="flex-1"
            />
            <Button onClick={addFloor} disabled={saving || !newFloorName.trim()} size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              追加
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ブロック管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            <CardTitle>ブロック / ユニット管理</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 既存ブロック一覧 */}
          {blocks.length > 0 && (
            <div className="space-y-2">
              {blocks.map(b => {
                const floorName = floors.find(f => f.id === b.floor_id)?.name;
                return (
                  <div key={b.id} className="flex items-center gap-3 border rounded-lg px-3 py-2">
                    <div className="w-4 h-4 rounded shrink-0" style={{ background: b.color }} />
                    <span className="text-sm font-medium flex-1">{b.name}</span>
                    {/* フロア変更 */}
                    <Select
                      value={b.floor_id ?? "none"}
                      onValueChange={v => updateBlockFloor(b.id, v === "none" ? null : v)}
                    >
                      <SelectTrigger className="w-36 h-7 text-xs">
                        <span>{floorName ?? "フロア未設定"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">フロア未設定</SelectItem>
                        {floors.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteBlock(b.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          {blocks.length === 0 && (
            <p className="text-sm text-gray-500">ブロックが登録されていません。</p>
          )}

          {/* ブロック追加フォーム */}
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-600">ブロックを追加</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">ブロック名 *</Label>
                <Input
                  placeholder="例: 1病棟、Aユニット"
                  value={newBlock.name}
                  onChange={e => setNewBlock(p => ({ ...p, name: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">フロア</Label>
                <Select
                  value={newBlock.floor_id ?? "none"}
                  onValueChange={v => setNewBlock(p => ({ ...p, floor_id: v === "none" ? null : v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <span>{newBlock.floor_id ? floors.find(f => f.id === newBlock.floor_id)?.name : "未設定"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未設定</SelectItem>
                    {floors.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">カラー</Label>
              <div className="flex gap-2 flex-wrap">
                {BLOCK_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewBlock(p => ({ ...p, color: c }))}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${newBlock.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={addBlock}
              disabled={saving || !newBlock.name.trim()}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              追加
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
