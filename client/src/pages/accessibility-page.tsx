import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Check, Copy, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Funções de cálculo de contraste baseadas nas diretrizes WCAG 2.0
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getLuminance(color: { r: number; g: number; b: number }): number {
  const { r, g, b } = color;
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 0;

  const luminance1 = getLuminance(rgb1);
  const luminance2 = getLuminance(rgb2);

  const brightest = Math.max(luminance1, luminance2);
  const darkest = Math.min(luminance1, luminance2);

  return (brightest + 0.05) / (darkest + 0.05);
}

function getWCAGLevel(contrastRatio: number): string {
  if (contrastRatio >= 7) {
    return "AAA";
  } else if (contrastRatio >= 4.5) {
    return "AA";
  } else if (contrastRatio >= 3) {
    return "AA (Texto Grande)";
  } else {
    return "Falha";
  }
}

function getContrastColor(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return "#ffffff";
  const luminance = getLuminance(rgb);
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function adjustColorBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  const newR = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
  const newG = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
  const newB = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));

  return rgbToHex(newR, newG, newB);
}

export default function AccessibilityPage() {
  const { toast } = useToast();
  const [foregroundColor, setForegroundColor] = useState<string>("#000000");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [contrastRatio, setContrastRatio] = useState<number>(21);
  const [wcagLevel, setWcagLevel] = useState<string>("AAA");
  const [textSize, setTextSize] = useState<number>(16);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(0);
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);

  // Calculando o contraste e a classificação WCAG sempre que as cores mudam
  useEffect(() => {
    const ratio = getContrastRatio(foregroundColor, backgroundColor);
    setContrastRatio(ratio);
    setWcagLevel(getWCAGLevel(ratio));

    // Gerar cores sugeridas com melhor contraste
    if (ratio < 4.5) {
      const suggestions: string[] = [];
      
      // Escurecer o texto se ele for muito claro
      const rgb = hexToRgb(foregroundColor);
      if (rgb) {
        const lum = getLuminance(rgb);
        if (lum > 0.5) {
          for (let i = 10; i <= 50; i += 10) {
            const darker = adjustColorBrightness(foregroundColor, -i);
            const newRatio = getContrastRatio(darker, backgroundColor);
            if (newRatio >= 4.5 && !suggestions.includes(darker)) {
              suggestions.push(darker);
              if (suggestions.length >= 5) break;
            }
          }
        } else {
          // Clarear o texto se ele for muito escuro
          for (let i = 10; i <= 50; i += 10) {
            const lighter = adjustColorBrightness(foregroundColor, i);
            const newRatio = getContrastRatio(lighter, backgroundColor);
            if (newRatio >= 4.5 && !suggestions.includes(lighter)) {
              suggestions.push(lighter);
              if (suggestions.length >= 5) break;
            }
          }
        }
      }
      
      setSuggestedColors(suggestions);
    } else {
      setSuggestedColors([]);
    }
  }, [foregroundColor, backgroundColor]);

  // Ajustes de brilho
  useEffect(() => {
    if (brightness !== 0) {
      const adjustedForeground = adjustColorBrightness(foregroundColor, brightness);
      setForegroundColor(adjustedForeground);
      setBrightness(0);
    }
  }, [brightness, foregroundColor]);

  // Função para copiar cores para a área de transferência
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${text} foi copiado para área de transferência.`,
    });
  };

  // Função para aplicar cor sugerida
  const applySuggestedColor = (color: string) => {
    setForegroundColor(color);
    toast({
      title: "Cor aplicada",
      description: "A cor sugerida foi aplicada ao texto.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Verificador de Contraste para Acessibilidade
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Verifique se as cores do seu design atendem aos padrões de acessibilidade WCAG 2.0.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cores</CardTitle>
              <CardDescription>
                Selecione as cores de texto e fundo para verificar o contraste.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="foreground">Cor do Texto</Label>
                <div className="flex items-center space-x-2">
                  <div
                    className="h-8 w-8 rounded border"
                    style={{ backgroundColor: foregroundColor }}
                  />
                  <Input
                    id="foreground"
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    maxLength={7}
                  />
                  <Input
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="h-8 w-16 p-0"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(foregroundColor)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">Cor de Fundo</Label>
                <div className="flex items-center space-x-2">
                  <div
                    className="h-8 w-8 rounded border"
                    style={{ backgroundColor: backgroundColor }}
                  />
                  <Input
                    id="background"
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    maxLength={7}
                  />
                  <Input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-8 w-16 p-0"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(backgroundColor)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ajuste de Brilho do Texto</Label>
                <Slider
                  defaultValue={[0]}
                  min={-50}
                  max={50}
                  step={1}
                  onValueChange={(value) => setBrightness(value[0])}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Escurecer</span>
                  <span>0%</span>
                  <span>Clarear</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tamanho do Texto</Label>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTextSize(Math.max(textSize - 1, 12))}
                  >
                    -
                  </Button>
                  <Input 
                    type="number" 
                    value={textSize} 
                    onChange={(e) => setTextSize(Number(e.target.value))}
                    min={12} 
                    max={36} 
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setTextSize(Math.min(textSize + 1, 36))}
                  >
                    +
                  </Button>
                  <Button
                    variant={isBold ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsBold(!isBold)}
                  >
                    <strong>B</strong>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visualização</CardTitle>
              <CardDescription>
                Veja como o texto aparece com as cores selecionadas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="p-8 rounded-md flex items-center justify-center"
                style={{ backgroundColor: backgroundColor }}
              >
                <p
                  style={{
                    color: foregroundColor,
                    fontSize: `${textSize}px`,
                    fontWeight: isBold ? 'bold' : 'normal',
                  }}
                >
                  Texto de exemplo para testar o contraste
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Relação de Contraste</p>
                  <p className="text-sm">{contrastRatio.toFixed(2)}:1</p>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Nível WCAG</p>
                  <div className={`px-2 py-0.5 rounded-md text-sm ${
                    wcagLevel === 'AAA' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : wcagLevel === 'AA' 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : wcagLevel === 'AA (Texto Grande)'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {wcagLevel}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Requisitos WCAG 2.0:</p>
                <div className="space-y-1">
                  <div className="flex items-center">
                    <div className={`h-4 w-4 mr-2 flex items-center justify-center rounded-full ${
                      contrastRatio >= 4.5 ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {contrastRatio >= 4.5 && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <p className="text-sm">AA: Texto normal (mínimo 4.5:1)</p>
                  </div>

                  <div className="flex items-center">
                    <div className={`h-4 w-4 mr-2 flex items-center justify-center rounded-full ${
                      contrastRatio >= 3 ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {contrastRatio >= 3 && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <p className="text-sm">AA: Texto grande (mínimo 3:1)</p>
                  </div>

                  <div className="flex items-center">
                    <div className={`h-4 w-4 mr-2 flex items-center justify-center rounded-full ${
                      contrastRatio >= 7 ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {contrastRatio >= 7 && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <p className="text-sm">AAA: Texto normal (mínimo 7:1)</p>
                  </div>

                  <div className="flex items-center">
                    <div className={`h-4 w-4 mr-2 flex items-center justify-center rounded-full ${
                      contrastRatio >= 4.5 ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {contrastRatio >= 4.5 && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <p className="text-sm">AAA: Texto grande (mínimo 4.5:1)</p>
                  </div>
                </div>
              </div>

              {suggestedColors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Cores sugeridas para melhorar o contraste:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedColors.map((color, index) => (
                      <div 
                        key={index} 
                        className="flex flex-col items-center" 
                        title={`Contraste: ${getContrastRatio(color, backgroundColor).toFixed(2)}:1`}
                      >
                        <Button
                          className="h-8 w-8 p-0"
                          style={{ backgroundColor: color, color: getContrastColor(color) }}
                          onClick={() => applySuggestedColor(color)}
                        >
                          Aa
                        </Button>
                        <span className="text-xs mt-1">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>
                Este verificador de contraste calcula a razão entre a luminância relativa das cores de primeiro plano e de fundo, 
                de acordo com a fórmula definida pelas diretrizes de Acessibilidade para Conteúdo Web (WCAG) 2.0.
              </p>
              
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Níveis de conformidade WCAG:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>
                      <strong>Nível AA</strong> (mínimo recomendado):
                      <ul className="list-disc pl-5">
                        <li>Contraste de 4.5:1 para texto normal (menor que 18pt ou 14pt negrito)</li>
                        <li>Contraste de 3:1 para texto grande (18pt ou maior, ou 14pt negrito ou maior)</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Nível AAA</strong> (conformidade avançada):
                      <ul className="list-disc pl-5">
                        <li>Contraste de 7:1 para texto normal (menor que 18pt ou 14pt negrito)</li>
                        <li>Contraste de 4.5:1 para texto grande (18pt ou maior, ou 14pt negrito ou maior)</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}