import React, { useState, useEffect } from 'react';
import { Shield, Globe, Plus, Trash2, CheckCircle, XCircle, Settings } from 'lucide-react';
import api from '../../utils/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';

export default function FirewallControl() {
    const [config, setConfig] = useState({ is_enabled: true, allowed_domains: [] });
    const [newDomain, setNewDomain] = useState('');
    const [loading, setLoading] = useState(true);
    const { success, error } = useToast();

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const resp = await api.get('/firewall/config');
            setConfig(resp.data);
        } catch (err) {
            console.error('Failed to fetch firewall config', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (newConfig) => {
        try {
            await api.post('/firewall/update', newConfig);
            setConfig(newConfig);
            success('Firewall Updated', 'Changes applied instantly to the network edge.');
        } catch (err) {
            error('Update Failed', 'Could not sync with firewall agent.');
        }
    };

    const addDomain = () => {
        if (!newDomain || config.allowed_domains.includes(newDomain)) return;
        const updatedDomains = [...config.allowed_domains, newDomain.toLowerCase()];
        handleUpdate({ ...config, allowed_domains: updatedDomains });
        setNewDomain('');
    };

    const removeDomain = (domain) => {
        const updatedDomains = config.allowed_domains.filter(d => d !== domain);
        handleUpdate({ ...config, allowed_domains: updatedDomains });
    };

    const toggleFirewall = () => {
        handleUpdate({ ...config, is_enabled: !config.is_enabled });
    };

    if (loading) return <div>Loading Security Shields...</div>;

    return (
        <Card className="p-6 border-l-4 border-l-primary overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Shield size={120} />
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="text-primary" />
                        Network Firewall
                    </h2>
                    <p className="text-muted-foreground">Manage school-wide browsing permissions in real-time.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${config.is_enabled ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {config.is_enabled ? 'Active Protection' : 'Disabled'}
                    </span>
                    <Button 
                        variant={config.is_enabled ? "secondary" : "primary"}
                        onClick={toggleFirewall}
                    >
                        {config.is_enabled ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        {config.is_enabled ? "Deactivate" : "Activate"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Input */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                            <Plus size={14} /> 
                            Allow New Domain
                        </h3>
                        <div className="flex flex-col gap-3">
                            <Input 
                                placeholder="e.g. khanacademy.org" 
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addDomain()}
                            />
                            <Button className="w-full" onClick={addDomain} variant="primary">
                                Add to Allowlist
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-xs text-primary-foreground/80 leading-relaxed font-medium">
                        <p>💡 Tip: Adding "google.com" also allows subdomains like "docs.google.com" automatically.</p>
                    </div>
                </div>

                {/* Right: List */}
                <div className="lg:col-span-2">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                        <Globe size={14} /> 
                        Whitelisted Destinations ({config.allowed_domains.length})
                    </h3>
                    
                    <div className="bg-muted/20 rounded-2xl border border-border/40 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {config.allowed_domains.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground italic">
                                No domains added. Everything is blocked.
                            </div>
                        ) : (
                            <div className="divide-y divide-border/30">
                                {config.allowed_domains.map((domain) => (
                                    <div key={domain} className="p-4 flex justify-between items-center group hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                            <span className="font-mono text-sm">{domain}</span>
                                        </div>
                                        <button 
                                            onClick={() => removeDomain(domain)}
                                            className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
