// 管理: 教室混雑マップ・グラフに関する設定
// 誤操作防止のため、値の編集はローカルのドラフトに保持し「保存」ボタンでまとめて反映する
import { useState, type ReactNode } from "react";
import type { EnvName, YearSettings } from "@/types";
import { updateYearSettings } from "@/lib/dataApi";
import { SaveBar } from "./SaveBar";
import { HourStepper } from "@/components/common/HourStepper";
import { NumberField } from "@/components/common/NumberField";

export function OccupancySettings({
  env,
  yearId,
  settings,
}: {
  env: EnvName;
  yearId: string;
  settings: YearSettings;
}) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateYearSettings(env, yearId, { settings: form });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-700">
          混雑マップ・グラフ設定
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="教室定員（人）">
            <NumberField
              value={form.roomCapacity}
              onChange={(roomCapacity) => setForm({ ...form, roomCapacity })}
              className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="想定滞在時間（分）">
            <NumberField
              value={form.occupancyStayMinutes}
              onChange={(occupancyStayMinutes) =>
                setForm({ ...form, occupancyStayMinutes })
              }
              className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="濃い色の境界（分以内）">
            <NumberField
              value={form.colorThresholdMinutes.recent}
              onChange={(recent) =>
                setForm({
                  ...form,
                  colorThresholdMinutes: {
                    ...form.colorThresholdMinutes,
                    recent,
                  },
                })
              }
              className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="薄い色の境界（分以内）">
            <NumberField
              value={form.colorThresholdMinutes.mid}
              onChange={(mid) =>
                setForm({
                  ...form,
                  colorThresholdMinutes: { ...form.colorThresholdMinutes, mid },
                })
              }
              className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="棒グラフの縦軸上限（人）">
            <NumberField
              value={form.chartMaxCount}
              onChange={(chartMaxCount) => setForm({ ...form, chartMaxCount })}
              className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>

          {/* ボタン操作を含むためlabel（Field）ではなくdivで構成する */}
          <div className="text-sm">
            <span className="mb-1 block text-neutral-600">
              棒グラフの表示時間（0〜24時）
            </span>
            <div className="flex items-center gap-2">
              <HourStepper
                value={form.chartHours.start}
                onChange={(start) =>
                  setForm({
                    ...form,
                    chartHours: { ...form.chartHours, start },
                  })
                }
                label="既定表示の開始時刻"
                size={38}
              />
              <span className="text-neutral-400">〜</span>
              <HourStepper
                value={form.chartHours.end}
                onChange={(end) =>
                  setForm({ ...form, chartHours: { ...form.chartHours, end } })
                }
                label="既定表示の終了時刻"
                size={38}
              />
            </div>
          </div>
        </div>
      </section>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onCancel={() => setForm(settings)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-neutral-600">{label}</span>
      {children}
    </label>
  );
}
