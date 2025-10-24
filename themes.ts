export type ThemeName = 'uranian_blue' | 'light_sky_blue' | 'thistle' | 'fairy_tale' | 'carnation_pink' | 'dark' | 'ocean';

export interface Theme {
    name: ThemeName;
    label: string;
    radius: string;
    colors: {
        background: string;
        foreground: string;
        card: string;
        'card-foreground': string;
        popover: string;
        'popover-foreground': string;
        primary: string;
        'primary-foreground': string;
        secondary: string;
        'secondary-foreground': string;
        muted: string;
        'muted-foreground': string;
        accent: string;
        'accent-foreground': string;
        destructive: string;
        'destructive-foreground': string;
        border: string;
        input: string;
        ring: string;
    }
}

export const themes: Theme[] = [
    {
        name: 'uranian_blue',
        label: 'Uranian Blue',
        radius: '0.5rem',
        colors: {
            background: '209 100% 94.9%',
            foreground: '209 97% 17.3%',
            card: '209 100% 97.5%',
            'card-foreground': '209 97% 17.3%',
            popover: '209 100% 97.5%',
            'popover-foreground': '209 97% 17.3%',
            primary: '209 96% 52%',
            'primary-foreground': '209 100% 97.5%',
            secondary: '209 95% 91.8%',
            'secondary-foreground': '209 96% 35.3%',
            muted: '209 100% 94.9%',
            'muted-foreground': '209 25% 45%',
            accent: '209 95% 91.8%',
            'accent-foreground': '209 96% 35.3%',
            destructive: '0 84.2% 60.2%',
            'destructive-foreground': '210 40% 98%',
            border: '209 95% 91.8%',
            input: '209 95% 91.8%',
            ring: '209 96% 52%',
        }
    },
    {
        name: 'light_sky_blue',
        label: 'Sky Blue',
        radius: '0.5rem',
        colors: {
            background: '210 100% 92.7%',
            foreground: '210 100% 16.5%',
            card: '209 100% 96.3%',
            'card-foreground': '210 100% 16.5%',
            popover: '209 100% 96.3%',
            'popover-foreground': '210 100% 16.5%',
            primary: '210 100% 49.2%',
            'primary-foreground': '209 100% 96.3%',
            secondary: '210 100% 89.6%',
            'secondary-foreground': '210 100% 32.7%',
            muted: '210 100% 92.7%',
            'muted-foreground': '210 25% 45%',
            accent: '210 100% 89.6%',
            'accent-foreground': '210 100% 32.7%',
            destructive: '0 84.2% 60.2%',
            'destructive-foreground': '0 0% 98%',
            border: '210 100% 89.6%',
            input: '210 100% 89.6%',
            ring: '210 100% 49.2%',
        }
    },
    {
        name: 'thistle',
        label: 'Thistle',
        radius: '0.5rem',
        colors: {
            background: '284 38% 91.2%',
            foreground: '279 33% 16.1%',
            card: '285 43% 95.7%',
            'card-foreground': '279 33% 16.1%',
            popover: '285 43% 95.7%',
            'popover-foreground': '279 33% 16.1%',
            primary: '280 36% 46.9%',
            'primary-foreground': '285 43% 95.7%',
            secondary: '282 33% 87.3%',
            'secondary-foreground': '281 35% 31.2%',
            muted: '284 38% 91.2%',
            'muted-foreground': '279 15% 45%',
            accent: '282 33% 87.3%',
            'accent-foreground': '281 35% 31.2%',
            destructive: '0 84.2% 60.2%',
            'destructive-foreground': '0 0% 98%',
            border: '282 33% 87.3%',
            input: '282 33% 87.3%',
            ring: '280 36% 46.9%',
        }
    },
    {
        name: 'fairy_tale',
        label: 'Fairy Tale',
        radius: '0.5rem',
        colors: {
            background: '339 100% 95.5%',
            foreground: '338 100% 17.8%',
            card: '339 100% 98%',
            'card-foreground': '338 100% 17.8%',
            popover: '339 100% 98%',
            'popover-foreground': '338 100% 17.8%',
            primary: '338 100% 53.3%',
            'primary-foreground': '339 100% 98%',
            secondary: '339 100% 93.1%',
            'secondary-foreground': '338 100% 35.3%',
            muted: '339 100% 95.5%',
            'muted-foreground': '338 30% 45%',
            accent: '339 100% 93.1%',
            'accent-foreground': '338 100% 35.3%',
            destructive: '0 84.2% 60.2%',
            'destructive-foreground': '0 0% 98%',
            border: '339 100% 93.1%',
            input: '339 100% 93.1%',
            ring: '338 100% 53.3%',
        }
    },
    {
        name: 'carnation_pink',
        label: 'Carnation',
        radius: '0.5rem',
        colors: {
            background: '339 100% 93.3%',
            foreground: '340 100% 16.9%',
            card: '339 100% 96.9%',
            'card-foreground': '340 100% 16.9%',
            popover: '339 100% 96.9%',
            'popover-foreground': '340 100% 16.9%',
            primary: '339 100% 50%',
            'primary-foreground': '339 100% 96.9%',
            secondary: '339 100% 90.6%',
            'secondary-foreground': '339 100% 33.1%',
            muted: '339 100% 93.3%',
            'muted-foreground': '340 30% 45%',
            accent: '339 100% 90.6%',
            'accent-foreground': '339 100% 33.1%',
            destructive: '0 84.2% 60.2%',
            'destructive-foreground': '0 0% 98%',
            border: '339 100% 90.6%',
            input: '339 100% 90.6%',
            ring: '339 100% 50%',
        }
    },
    {
        name: 'dark',
        label: 'Dark',
        radius: '0.5rem',
        colors: {
            background: '224 71.4% 4.1%',
            foreground: '210 20% 98%',
            card: '215 27.9% 16.9%',
            'card-foreground': '210 20% 98%',
            popover: '215 27.9% 16.9%',
            'popover-foreground': '210 20% 98%',
            primary: '210 40% 98%',
            'primary-foreground': '222.2 47.4% 11.2%',
            secondary: '215 27.9% 16.9%',
            'secondary-foreground': '210 20% 98%',
            muted: '215 27.9% 16.9%',
            'muted-foreground': '217.9 10.6% 64.9%',
            accent: '215 27.9% 16.9%',
            'accent-foreground': '210 20% 98%',
            destructive: '0 62.8% 30.6%',
            'destructive-foreground': '210 20% 98%',
            border: '215 27.9% 16.9%',
            input: '215 27.9% 16.9%',
            ring: '216 12.2% 83.9%',
        }
    },
    {
        name: 'ocean',
        label: 'Ocean',
        radius: '0.5rem',
        colors: {
            background: '220 40% 6%',
            foreground: '200 15% 95%',
            card: '220 40% 8%',
            'card-foreground': '200 15% 95%',
            popover: '220 40% 8%',
            'popover-foreground': '200 15% 95%',
            primary: '190 85% 60%',
            'primary-foreground': '220 40% 6%',
            secondary: '210 30% 15%',
            'secondary-foreground': '200 15% 95%',
            muted: '210 30% 15%',
            'muted-foreground': '200 10% 60%',
            accent: '210 30% 15%',
            'accent-foreground': '190 85% 60%',
            destructive: '0 72% 51%',
            'destructive-foreground': '0 0% 98%',
            border: '210 30% 20%',
            input: '210 30% 20%',
            ring: '190 85% 60%',
        }
    },
];