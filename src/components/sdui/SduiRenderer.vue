<script setup lang="ts">
import {
  Award,
  BookOpen,
  Compass,
  Globe,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  ExternalLink,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import type {
  ContentBlock,
  HeroBlockContent,
  IconGridBlockContent,
  RichTextBlockContent,
  StatsBlockContent,
} from '@/types/api'

defineProps<{
  blocks: ContentBlock[]
}>()

const iconMap: Record<string, Component> = {
  GraduationCap,
  Globe,
  Award,
  BookOpen,
  Compass,
  ShieldCheck,
  Sparkles,
}

function getIcon(name: string): Component {
  return iconMap[name] || Sparkles
}

function asHero(c: ContentBlock['content']): HeroBlockContent {
  return c as HeroBlockContent
}

function asStats(c: ContentBlock['content']): StatsBlockContent {
  return c as StatsBlockContent
}

function asIconGrid(c: ContentBlock['content']): IconGridBlockContent {
  return c as IconGridBlockContent
}

function asRichText(c: ContentBlock['content']): RichTextBlockContent {
  return c as RichTextBlockContent
}
</script>

<template>
  <div class="space-y-6">
    <template v-for="block in blocks" :key="block.id">
      <!-- HERO_BLOCK -->
      <section
        v-if="block.blockType === 'HERO_BLOCK'"
        class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary p-8 md:p-10 text-white shadow-md"
      >
        <div class="relative z-10 max-w-2xl">
          <span
            v-if="asHero(block.content).badgeText"
            class="inline-block rounded-full bg-white/20 backdrop-blur-sm px-3.5 py-1 text-xs font-semibold tracking-wide mb-4"
          >
            {{ asHero(block.content).badgeText }}
          </span>
          <h2 class="text-2xl md:text-4xl font-bold tracking-tight mb-3">
            {{ asHero(block.content).headline }}
          </h2>
          <p
            v-if="asHero(block.content).subheadline"
            class="text-sm md:text-base text-white/90 leading-relaxed mb-6"
          >
            {{ asHero(block.content).subheadline }}
          </p>
          <a
            v-if="asHero(block.content).ctaText"
            :href="asHero(block.content).ctaUrl || '#'"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 transition"
          >
            {{ asHero(block.content).ctaText }}
            <ExternalLink class="h-4 w-4" />
          </a>
        </div>
        <div
          v-if="asHero(block.content).imageUrl"
          class="mt-6 md:mt-0 md:absolute md:right-8 md:top-1/2 md:-translate-y-1/2 md:w-64 md:h-44 rounded-xl overflow-hidden border border-white/20 shadow-lg"
        >
          <img
            :src="asHero(block.content).imageUrl"
            alt="Program Hero"
            class="h-full w-full object-cover"
          />
        </div>
      </section>

      <!-- STATS_BLOCK -->
      <section v-else-if="block.blockType === 'STATS_BLOCK'" class="space-y-3">
        <h3 v-if="asStats(block.content).title" class="text-lg font-bold text-slate-900">
          {{ asStats(block.content).title }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            v-for="(item, idx) in asStats(block.content).items"
            :key="idx"
            class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="text-2xl font-extrabold text-primary">{{ item.value }}</div>
            <div class="mt-1 text-sm font-semibold text-slate-800">{{ item.label }}</div>
            <div v-if="item.description" class="mt-0.5 text-xs text-slate-500">
              {{ item.description }}
            </div>
          </div>
        </div>
      </section>

      <!-- ICON_GRID_BLOCK -->
      <section v-else-if="block.blockType === 'ICON_GRID_BLOCK'" class="space-y-3">
        <h3 v-if="asIconGrid(block.content).title" class="text-lg font-bold text-slate-900">
          {{ asIconGrid(block.content).title }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            v-for="(item, idx) in asIconGrid(block.content).items"
            :key="idx"
            class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-primary/40 transition"
          >
            <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <component :is="getIcon(item.icon)" class="h-5 w-5" />
            </div>
            <h4 class="text-sm font-bold text-slate-900 mb-1">{{ item.title }}</h4>
            <p class="text-xs text-slate-600 leading-relaxed">{{ item.description }}</p>
          </div>
        </div>
      </section>

      <!-- RICH_TEXT_BLOCK -->
      <section
        v-else-if="block.blockType === 'RICH_TEXT_BLOCK'"
        class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        :class="{
          'text-left': !asRichText(block.content).alignment || asRichText(block.content).alignment === 'left',
          'text-center': asRichText(block.content).alignment === 'center',
          'text-right': asRichText(block.content).alignment === 'right',
        }"
      >
        <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {{ asRichText(block.content).body }}
        </p>
      </section>
    </template>
  </div>
</template>
