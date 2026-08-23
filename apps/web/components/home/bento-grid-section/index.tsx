"use client"

import { useState, useEffect, useMemo } from "react"
import { BentoItem, LayerItem } from "./bento-item"
import { BentoBasicLayer } from "./layers/basic"
import { BentoGradientLayer } from "./layers/gradient"
import { BentoImageLayer } from "./layers/image"
import { BentoVideoLayer } from "./layers/video"
import { BentoEmitterLayer } from "./layers/emitter"
import { BentoTransformLayer } from "./layers/transform"
import { BentoReplicatorLayer } from "./layers/replicator"
import { BentoLiquidGlassLayer } from "./layers/liquid-glass"
import { cn } from "@/lib/utils"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Download, Edit, Youtube, Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/i18n-provider"

function isVideo(src: string) {
    const lower = src.toLowerCase()
    return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.includes("/video/")
}

export function BentoGridSection() {
    const { t } = useI18n()
    const [selectedWallpaper, setSelectedWallpaper] = useState<any | null>(null)
    const [wallpaperData, setWallpaperData] = useState<any>(null)
    const [copied, setCopied] = useState(false)
    const layers: LayerItem[] = useMemo(() => [
        { id: "basic", title: t("home.layers.basic.title"), description: t("home.layers.basic.description"), type: "basic", exampleId: "4983462" },
        { id: "gradient", title: t("home.layers.gradient.title"), description: t("home.layers.gradient.description"), type: "gradient", exampleId: "9612103" },
        { id: "image", title: t("home.layers.image.title"), description: t("home.layers.image.description"), type: "image", exampleId: "9372814" },
        { id: "video", title: t("home.layers.video.title"), description: t("home.layers.video.description"), type: "video", exampleId: "9232798" },
        { id: "emitter", title: t("home.layers.emitter.title"), description: t("home.layers.emitter.description"), type: "emitter", exampleId: "1633426" },
        { id: "transform", title: t("home.layers.transform.title"), description: t("home.layers.transform.description"), type: "transform", exampleId: "9531199" },
        { id: "replicator", title: t("home.layers.replicator.title"), description: t("home.layers.replicator.description"), type: "replicator", exampleId: "5733952" },
        { id: "liquid-glass", title: t("home.layers.liquidGlass.title"), description: t("home.layers.liquidGlass.description"), type: "liquid-glass", exampleId: "7670567" },
    ], [t])

    useEffect(() => {
        fetch("https://raw.githubusercontent.com/CAPlayground/wallpapers/refs/heads/main/wallpapers.json")
            .then(res => res.json())
            .then(data => setWallpaperData(data))
            .catch(() => { })
    }, [])

    const handleExampleClick = (exampleId?: string) => {
        if (!wallpaperData || !exampleId) return
        const example = wallpaperData.wallpapers.find((w: any) => String(w.id) === exampleId)
        if (example) setSelectedWallpaper(example)
    }

    const handleCopyLink = (wallpaper: any) => {
        const url = `${window.location.origin}/wallpapers?id=${wallpaper.id}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const renderLayer = (type: string, isHovered: boolean) => {
        switch (type) {
            case 'basic': return <BentoBasicLayer />
            case 'gradient': return <BentoGradientLayer />
            case 'image': return <BentoImageLayer />
            case 'video': return <BentoVideoLayer isHovered={isHovered} />
            case 'emitter': return <BentoEmitterLayer isHovered={isHovered} />
            case 'transform': return <BentoTransformLayer />
            case 'replicator': return <BentoReplicatorLayer />
            case 'liquid-glass': return <BentoLiquidGlassLayer />
            default: return null
        }
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 py-24">
            <div className="text-center mb-16 space-y-4">
                <h2 className="font-heading text-4xl md:text-6xl font-bold">
                    {t("home.layers.title")}
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                    {t("home.layers.description")}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-4 gap-4">
                {layers.map((item, index) => (
                    <BentoItem
                        key={item.id}
                        item={item}
                        renderLayer={(isHovered: boolean) => renderLayer(item.type, isHovered)}
                        onExampleClick={item.exampleId ? () => handleExampleClick(item.exampleId) : undefined}
                        className={cn(
                            index >= 6 ? "lg:col-span-3 xl:col-span-1" : "lg:col-span-2 xl:col-span-1"
                        )}
                    />
                ))}
            </div>

            <Dialog open={!!selectedWallpaper} onOpenChange={(open: boolean) => !open && setSelectedWallpaper(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {selectedWallpaper && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">{selectedWallpaper.name}</DialogTitle>
                                <DialogDescription className="text-base">
                                    {t("home.featured.by", { creator: selectedWallpaper.creator, source: selectedWallpaper.from })}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 space-y-6">
                                <div className="rounded-lg border bg-background overflow-hidden relative">
                                    <AspectRatio ratio={1} className="flex items-center justify-center">
                                        {isVideo(`${wallpaperData.base_url}${selectedWallpaper.preview}`) ? (
                                            <video
                                                src={`${wallpaperData.base_url}${selectedWallpaper.preview}`}
                                                autoPlay muted loop playsInline
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <img
                                                src={`${wallpaperData.base_url}${selectedWallpaper.preview}`}
                                                alt={selectedWallpaper.name}
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                    </AspectRatio>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">{t("home.layers.wallpaperDescription")}</h3>
                                    <p className="text-sm text-muted-foreground">{selectedWallpaper.description}</p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <Button className="w-full" onClick={() => window.open(`${wallpaperData.base_url}${selectedWallpaper.file}`, '_blank')}>
                                        <Download className="h-4 w-4 mr-2" />
                                        {t("home.layers.download")}
                                    </Button>

                                    <Button variant="outline" className="w-full" asChild>
                                        <a href={`/wallpapers?id=${selectedWallpaper.id}&action=edit`}>
                                            <Edit className="h-4 w-4 mr-2" /> {t("home.layers.openEditor")}
                                        </a>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => window.open('https://www.youtube.com/watch?v=nSBQIwAaAEc', '_blank')}
                                    >
                                        <Youtube className="h-4 w-4 mr-2" />
                                        {t("home.layers.tutorial")}
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        className="w-full"
                                        onClick={() => handleCopyLink(selectedWallpaper)}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-4 w-4 mr-2" />
                                                {t("home.layers.copied")}
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-4 w-4 mr-2" />
                                                {t("home.layers.copyLink")}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

