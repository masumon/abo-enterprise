"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toast";

type FieldValue = string | number | boolean | Record<string, any>;

interface FormField {
  key: string;
  type: "text" | "number" | "email" | "url" | "boolean" | "textarea";
  label: string;
  required?: boolean;
  value: FieldValue;
}

interface JsonFormEditorProps {
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  schema?: FormField[];
  title?: string;
  className?: string;
}

export default function JsonFormEditor({
  value,
  onChange,
  schema,
  title = "Data Editor",
  className,
}: JsonFormEditorProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [rawValue, setRawValue] = useState(JSON.stringify(value, null, 2));
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToastStore((s) => s.push);

  const toggleExpanded = (key: string) => {
    const next = new Set(expandedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedKeys(next);
  };

  const handleFieldChange = (key: string, newVal: FieldValue) => {
    onChange({ ...value, [key]: newVal });
    const newErrors = { ...errors };
    delete newErrors[key];
    setErrors(newErrors);
  };

  const handleAddField = () => {
    const newKey = `field_${Object.keys(value).length + 1}`;
    onChange({ ...value, [newKey]: "" });
  };

  const handleDeleteField = (key: string) => {
    const updated = { ...value };
    delete updated[key];
    onChange(updated);
  };

  const handleRawSave = () => {
    try {
      const parsed = JSON.parse(rawValue);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Value must be a JSON object");
      }
      onChange(parsed);
      setShowRaw(false);
      toast("success", "JSON updated");
    } catch (e) {
      setErrors({
        _raw: (e as Error).message,
      });
    }
  };

  const renderFieldInput = (field: FormField, key: string) => {
    const baseProps = {
      value: field.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        let val: FieldValue = e.target.value;
        if (field.type === "number") val = parseFloat(e.target.value) || 0;
        if (field.type === "boolean") val = (e.target as HTMLInputElement).checked;
        handleFieldChange(key, val);
      },
      className:
        "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-400",
    };

    if (field.type === "textarea") {
      return (
        <textarea
          {...baseProps}
          rows={3}
          className={`${baseProps.className} resize-none`}
        />
      );
    }

    if (field.type === "boolean") {
      return (
        <input
          type="checkbox"
          checked={Boolean(field.value)}
          onChange={(e) => handleFieldChange(key, e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-brand-600"
        />
      );
    }

    return (
      <input
        type={field.type}
        {...baseProps}
      />
    );
  };

  const fields: FormField[] = schema || Object.entries(value).map(([k, v]) => ({
    key: k,
    type: typeof v === "number" ? "number" : "text",
    label: k.replace(/_/g, " ").toUpperCase(),
    value: v,
  }));

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-2 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
        >
          <Code2 className="w-4 h-4" />
          {showRaw ? "Form" : "Raw JSON"}
        </button>
      </div>

      {showRaw ? (
        <div className="space-y-2">
          <textarea
            value={rawValue}
            onChange={(e) => setRawValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-brand-400 resize-none"
            rows={12}
            spellCheck={false}
          />
          {errors._raw && (
            <div className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-700">{errors._raw}</span>
            </div>
          )}
          <button
            onClick={handleRawSave}
            className="w-full px-3 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            Update from JSON
          </button>
        </div>
      ) : (
        <div className="space-y-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-900">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {!schema && (
                  <button
                    onClick={() => handleDeleteField(field.key)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              {renderFieldInput(field, field.key)}
              {errors[field.key] && (
                <p className="text-xs text-red-600">{errors[field.key]}</p>
              )}
            </div>
          ))}

          {!schema && (
            <button
              onClick={handleAddField}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Field
            </button>
          )}
        </div>
      )}
    </div>
  );
}
