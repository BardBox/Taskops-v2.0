import { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Loader2 } from "lucide-react";

interface SettingsListEditorProps {
    title: string;
    description: string;
    settingKey: string;
    placeholder?: string;
}

export function SettingsListEditor({
    title,
    description,
    settingKey,
    placeholder = "Add new item..."
}: SettingsListEditorProps) {
    const { value, loading, addItem, removeItem } = useSettings(settingKey);
    const [newItem, setNewItem] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        if (!newItem.trim()) return;
        setIsAdding(true);
        await addItem(newItem.trim());
        setNewItem("");
        setIsAdding(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                </CardContent>
            </Card>
        );
    }

    const items = Array.isArray(value) ? value : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Input Area */}
                <div className="flex gap-2">
                    <Input
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="max-w-sm"
                    />
                    <Button
                        onClick={handleAdd}
                        disabled={!newItem.trim() || isAdding}
                        size="sm"
                        className="h-10"
                    >
                        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add
                    </Button>
                </div>

                {/* List Area */}
                <div className="flex flex-wrap gap-2 pt-2">
                    {items.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No items configured.</p>
                    )}

                    {items.map((item: string, index: number) => (
                        <div
                            key={index}
                            className="group flex items-center gap-2 bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-md border transition-colors"
                        >
                            <span className="text-sm font-medium">{item}</span>
                            <button
                                onClick={() => removeItem(item)}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                                title="Remove item"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
