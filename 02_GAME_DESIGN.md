# 02 — Game Design

## 1. Pilares
1. **Mobile primeiro:** tudo jogável com polegares (D-pad + 3 botões). Teclado é secundário.
2. **Escopo curto, identidade forte:** poucas áreas, cada uma memorável.
3. **Combate simples e legível:** espada, esquiva, magia de Lumi. Sem atributos/equipamentos complexos.
4. **Curiosidade recompensada:** segredos, missões secundárias e finais condicionados à exploração.
5. **Emoção sem excesso de texto:** diálogos curtos (≤ 4 linhas de ~45 caracteres por caixa).

## 2. Escopo-alvo (do documento original)
| Elemento | Qtd |
|---|---|
| Vilas/cidades | 2 (Brisamar, Valdora) |
| Florestas/áreas externas | 2 |
| Calabouços principais | 3 |
| Chefes | 5 |
| Personagens importantes | 5 |
| Inimigos comuns | 8–12 |
| Armas principais | 3 |
| Habilidades especiais | 4 |
| Missões secundárias | 3 |
| Finais | 3 |
| Duração | 1–2 h |

## 3. Controles
| Ação | Toque | Teclado |
|---|---|---|
| Mover | D-pad (esq.) | Setas / WASD |
| **A** — espada / interagir / avançar diálogo | botão A | Z, J, Espaço, Enter |
| **B** — esquiva (dash com invulnerabilidade) | botão B | X, K |
| **C** — magia de Lumi (projétil) | botão C | C, L |
| Avançar diálogo / telas | tocar na tela ou A | — |

Regras de UX mobile: botões ≥ 50 px; `touch-action:none`; sem zoom/scroll; reagir a `pointercancel`; zerar direções no `blur`.

## 4. Combate (valores atuais do Cap. 1 — ver `03_ARCHITECTURE.md`)
- **Vida do jogador:** 8 pontos (4 corações de 2). Dano padrão 1. Invulnerabilidade 60 frames após dano. Knockback.
- **Espada:** 14 frames; janela de acerto frames 4–10; hitbox 14×14 à frente; dano 2; um acerto por golpe por alvo.
- **Esquiva (B):** 9 frames, velocidade 2.6, invulnerável (≥12 frames de `inv`), na direção em que olha.
- **Magia (C):** projétil 2.6 px/frame, vida 70 frames, recarga 30, dano 1.
- **Slime corrompido:** 2 HP, persegue a 70 px, contato = 1 dano, 30% de chance de largar coração (+2 vida).
- **Chefe Guardião:** 24 HP; ciclo `walk → tel(40f) → slam(14f, raio 46) → rest(50f)`; abaixo de 12 HP lança 8 raízes radiais no slam e acelera o ciclo.
- **Princípio de design de chefes:** todo golpe forte tem **telegraph visível ≥ 30 frames**, janela de descanso após o golpe, e é possível vencer só com esquiva+espada.

## 5. Progressão e habilidades
Sem XP/níveis. Progressão = **vida máxima + habilidades + fragmentos**.

| Fragmento | Origem | Habilidade |
|---|---|---|
| Verde | chefe Cap. 2 | Lumi revela passagens secretas (mostra "brilhos" em paredes falsas) |
| Azul | chefe Cap. 3 | Magia de Lumi evolui: perfura inimigos e ativa interruptores à distância |
| Vermelho | chefe Cap. 4 (via Darius) | Quebrar barreiras especiais |
| (4ª habilidade) | Cap. 5 | Escudo de Lumi (defensiva, usada na luta final) |

> **Decisão D-01:** o MVP do Cap. 1 dá a magia de Lumi **desde o início** (tutorial no chefe). No jogo completo, o Fragmento Azul **melhora** a magia em vez de desbloqueá-la. Atualizar a Bíblia/design se mudar.

- Habilidade nova deve abrir exploração **sem exigir backtracking constante**.
- Vida máxima: +1 coração por chefe (Cap. 2: 5, Cap. 3: 6…) ou "pedaços de coração" em segredos.
- Armas principais (3): espada enferrujada (Cap. 1) → espada de Orin/guarda (Cap. 2–3) → espada de Darius (Cap. 4). Mudam dano/alcance, não a lógica.

## 6. Itens e economia
- Chaves (por área), poções de cura (+4), corações (+2, drop).
- Sem loja obrigatória. (Opcional: vendedor em Valdora trocando "cristais menores" dropados por poções.)

## 7. Sistema de flags (progressão e finais)
Estado global serializável (ver `03_ARCHITECTURE.md` §Flags):
```
chapter: 1..5
flags: { sign_read, runes_done, has_key_c1, boss1_defeated, cat_found, secret_records:0..N,
         frag_green, frag_blue, frag_red, darius_spared, final_choice }
```
Final 3 disponível se `cat_found && secret_records == N_TOTAL`.

## 8. Diálogo
- Caixa inferior com nome, typewriter (2 frames/char), toque avança/completa.
- Futuro: **escolhas** (2–3 opções), **condições por flag**, retrato do falante (Cap. 2+), reação de Lumi às escolhas.
- Tamanho: ≤ 180 caracteres por caixa.

## 9. Direção de arte
- Resolução lógica **240×160** (proporção 3:2 do GBA), tile **16 px**, escala inteira com `image-rendering: pixelated`.
- Paleta por região (manter 8–12 cores base por área):
  - Floresta: verdes escuros `#1c5a2a #2f7d3a #3d8b37`, corrupção `#2a1a30`.
  - Valdora: pedra cinza-azulada, telhados terracota, refugiados com cores quentes.
  - Ruínas: branco/azul-gelo, metal `#667`, runas ciano.
  - Santuário: azul-petróleo + cachoeira animada.
  - Salão final: vermelho/preto com cristal branco rachado.
- Sprites atuais são **retângulos desenhados em código**. Evolução: sprites em arrays/strings de pixels embutidos (ver plano F5), mantendo arquivo único.
- Animação: poucos frames, expressiva (squash no slime, piscar ao dano, brilho de Lumi).

## 10. Áudio
- Atual: bipes WebAudio curtos (`snd(freq, dur, tipo)`).
- Meta: música procedural/MIDI-like em WebAudio (sem arquivos externos): tema de Brisamar + variações por região, tema de chefe, tema final com a melodia original enriquecida. Botão de mudo. Respeitar autoplay (iniciar no primeiro toque).

## 11. Acessibilidade e conforto
- Texto mínimo 8 px lógicos (≈ 12+ px na tela). Contraste alto (sombra preta no texto).
- Opção futura: tamanho do texto, mudo, reduzir flashes, controles invertidos (A/B).
- Pausa ao perder foco (`visibilitychange`) — pendente.
