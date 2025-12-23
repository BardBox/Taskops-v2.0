import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SystemSetting {
    setting_key: string;
    setting_value: any;
    description?: string;
}

export function useSettings(key: string, defaultValue: any = []) {
    const [value, setValue] = useState<any>(defaultValue);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSetting();

        // Real-time subscription
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'system_settings',
                    filter: `setting_key=eq.${key}`
                },
                (payload) => {
                    if (payload.new && (payload.new as SystemSetting).setting_value) {
                        setValue((payload.new as SystemSetting).setting_value);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [key]);

    const fetchSetting = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', key)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data) {
                setValue(data.setting_value);
            }
        } catch (error) {
            console.error(`Error fetching setting ${key}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const updateSetting = async (newValue: any) => {
        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    setting_key: key,
                    setting_value: newValue
                });

            if (error) throw error;
            setValue(newValue);
            toast.success("Settings updated");
        } catch (error) {
            console.error(`Error updating setting ${key}:`, error);
            toast.error("Failed to update settings");
            throw error;
        }
    };

    const addItem = async (item: any) => {
        if (Array.isArray(value)) {
            if (value.includes(item)) {
                toast.error("Item already exists");
                return;
            }
            const newValue = [...value, item];
            await updateSetting(newValue);
        }
    };

    const removeItem = async (item: any) => {
        if (Array.isArray(value)) {
            const newValue = value.filter((i) => i !== item);
            await updateSetting(newValue);
        }
    };

    return {
        value,
        loading,
        updateSetting,
        addItem,
        removeItem
    };
}
