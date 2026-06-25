import React from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import Card from "./ui/Card";
import Button from "./ui/Button";

interface EmptyStateProps {
    title: string;
    message: string;
    icon?: React.ReactNode;
    actionText?: string;
    onAction?: () => void;
    showCard?: boolean;
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    title,
    message,
    icon,
    actionText,
    onAction,
    showCard = true,
    className = ""
}) => {
    const content = (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`text-center ${className}`}
        >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-float">
                {icon || <FileText className="h-8 w-8" />}
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
            <p className="mb-6 text-muted-foreground">{message}</p>
            {actionText && onAction && (
                <Button onClick={onAction} variant="primary">
                    {actionText}
                </Button>
            )}
        </motion.div>
    );

    if (showCard) {
        return (
            <Card hover={false} className="mx-auto max-w-md p-8 text-center">
                {content}
            </Card>
        );
    }

    return content;
};

export default EmptyState;
