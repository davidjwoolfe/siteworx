# MRIC model runs

All values are properties of the model under the illustrative parameters in `mric.py:default_params()`. They are predictions to be tested, not evidence about biology.

Horizon 180 days; treatment window closes at day 60; the remaining days test durability off-treatment.

## E1 - sequencing (Hypothesis A)

| schedule | nadir | final burden | log10 final | cleared | relapsed | peak MRIC | min margin (2nd half) | OXPHOS tox | cum. M4 influx |
|---|---|---|---|---|---|---|---|---|---|
| `untreated` | 2e+06 | 2.99e+07 | 7.48 | no | yes | 2.926 | -0.0442 | 0.0 | 4.68e+07 |
| `icb_only` | 2e+06 | 2.41e+07 | 7.38 | no | yes | 2.837 | -0.1103 | 0.0 | 2.95e+07 |
| `oxphos_only` | 2e+06 | 3.11e+07 | 7.49 | no | yes | 2.924 | -0.0854 | 60.0 | 4.82e+07 |
| `concurrent` | 2e+06 | 2.33e+07 | 7.37 | no | yes | 2.789 | -0.1151 | 60.0 | 2.64e+07 |
| `sequential_ox_then_icb` | 2e+06 | 2.38e+07 | 7.38 | no | yes | 2.824 | -0.1107 | 21.0 | 2.83e+07 |
| `sequential_overlap` | 2e+06 | 2.38e+07 | 7.38 | no | yes | 2.814 | -0.1120 | 28.0 | 2.79e+07 |
| `reverse_icb_then_ox` | 2e+06 | 2.81e+07 | 7.45 | no | yes | 2.900 | -0.0892 | 39.0 | 3.94e+07 |

## E2 - OXPHOS pulse width (Hypothesis A, quantitative)

| case | log10_final | relapsed | toxicity | cum_m4_influx_cells |
|---|---|---|---|---|
| `0` | 7.38 | 1 | 0 | 2.95e+07 |
| `3` | 7.38 | 1 | 3 | 2.89e+07 |
| `7` | 7.38 | 1 | 7 | 2.84e+07 |
| `10` | 7.38 | 1 | 10 | 2.81e+07 |
| `14` | 7.38 | 1 | 14 | 2.79e+07 |
| `21` | 7.38 | 1 | 21 | 2.79e+07 |
| `28` | 7.38 | 1 | 28 | 2.83e+07 |
| `35` | 7.38 | 1 | 35 | 2.94e+07 |
| `42` | 7.39 | 1 | 42 | 3.11e+07 |
| `56` | 7.43 | 1 | 56 | 3.67e+07 |

## E3 - which node raises visibility best (Hypothesis D)

| schedule | nadir | final burden | log10 final | cleared | relapsed | peak MRIC | min margin (2nd half) | OXPHOS tox | cum. M4 influx |
|---|---|---|---|---|---|---|---|---|---|
| `ox+icb` | 2e+06 | 2.37e+07 | 7.38 | no | yes | 2.815 | -0.1114 | 21.0 | 2.79e+07 |
| `gln+icb` | 2e+06 | 2.36e+07 | 7.37 | no | yes | 2.809 | -0.1112 | 0.0 | 2.75e+07 |
| `ampk+icb` | 2e+06 | 2.43e+07 | 7.39 | no | yes | 2.847 | -0.1097 | 0.0 | 3.02e+07 |
| `gln+ampk+icb` | 2e+06 | 2.36e+07 | 7.37 | no | yes | 2.809 | -0.1112 | 0.0 | 2.75e+07 |
| `ox+buffer+icb` | 2e+06 | 2.33e+07 | 7.37 | no | yes | 2.800 | -0.1121 | 21.0 | 2.68e+07 |
| `triple_gln_buf_icb` | 2e+06 | 2.34e+07 | 7.37 | no | yes | 2.800 | -0.1116 | 0.0 | 2.7e+07 |

## E4 - adaptive vs maximal pressure (Hypothesis C)

| schedule | nadir | final burden | log10 final | cleared | relapsed | peak MRIC | min margin (2nd half) | OXPHOS tox | cum. M4 influx |
|---|---|---|---|---|---|---|---|---|---|
| `maximal@M1dom` | 2e+06 | 2.36e+07 | 7.37 | no | yes | 2.798 | -0.1118 | 0.0 | 2.71e+07 |
| `adaptive_restrained@M1dom` | 2e+06 | 2.51e+07 | 7.40 | no | yes | 2.851 | -0.0849 | 0.0 | 3.12e+07 |
| `pulsed_icb@M1dom` | 2e+06 | 2.47e+07 | 7.39 | no | yes | 2.837 | -0.0967 | 0.0 | 3.01e+07 |
| `maximal@M2dom` | 1.85e+06 | 2.39e+07 | 7.38 | no | yes | 2.800 | -0.1116 | 0.0 | 2.75e+07 |
| `adaptive_restrained@M2dom` | 2e+06 | 2.52e+07 | 7.40 | no | yes | 2.849 | -0.0858 | 0.0 | 3.12e+07 |
| `pulsed_icb@M2dom` | 1.97e+06 | 2.5e+07 | 7.40 | no | yes | 2.837 | -0.0966 | 0.0 | 3.03e+07 |

## E5 - memory ablation: the null test (Hypothesis B)

| case | log10_final | cleared | relapsed | final_mric | min_margin_post_tx |
|---|---|---|---|---|---|
| `intact@M1dom` | 7.37 | 0 | 1 | 2.8 | -0.112 |
| `intact@M2dom` | 7.38 | 0 | 1 | 2.8 | -0.111 |
| `memory_ablated@M1dom` | 8.3 | 0 | 1 | 0.892 | -0.114 |
| `memory_ablated@M2dom` | 8.29 | 0 | 1 | 0.893 | -0.114 |

## E6 - sensitivity

| case | ox_log10_final | gln_log10_final | gln_wins | ox_relapsed | gln_relapsed |
|---|---|---|---|---|---|
| `recall_gain=0.0` | 8.3 | 8.31 | 0 | 1 | 1 |
| `recall_gain=0.5` | 7.88 | 7.89 | 0 | 1 | 1 |
| `recall_gain=1.0` | 7.65 | 7.65 | 1 | 1 | 1 |
| `recall_gain=2.1` | 7.38 | 7.37 | 1 | 1 | 1 |
| `recall_gain=4.0` | 7.13 | 7.13 | 1 | 0 | 0 |
| `recall_gain=8.0` | 6.87 | 6.86 | 1 | 0 | 0 |
| `alpha_escape=0.0` | 6.98 | 6.98 | 1 | 0 | 0 |
| `alpha_escape=0.2` | 7.24 | 7.24 | 1 | 0 | 0 |
| `alpha_escape=0.55` | 7.38 | 7.37 | 1 | 1 | 1 |
| `alpha_escape=1.0` | 7.43 | 7.42 | 1 | 1 | 1 |
| `alpha_escape=1.6` | 7.44 | 7.43 | 1 | 1 | 1 |
| `ox_phi_cost=0.0` | 7.37 | 7.37 | 0 | 1 | 1 |
| `ox_phi_cost=0.1` | 7.37 | 7.37 | 0 | 1 | 1 |
| `ox_phi_cost=0.3` | 7.38 | 7.37 | 1 | 1 | 1 |
| `ox_phi_cost=0.5` | 7.38 | 7.37 | 1 | 1 | 1 |
| `ox_phi_cost=0.7` | 7.39 | 7.37 | 1 | 1 | 1 |

## E7 - control feasibility map

| case | log10_final | relapsed | cleared | min_margin_post_tx | final_m4_frac |
|---|---|---|---|---|---|
| `lambda=0.0,alpha=0.0` | 8.61 | 1 | 0 | -0.109 | 0.0519 |
| `lambda=0.0,alpha=0.2` | 8.48 | 1 | 0 | -0.111 | 0.254 |
| `lambda=0.0,alpha=0.55` | 8.3 | 1 | 0 | -0.114 | 0.504 |
| `lambda=0.0,alpha=1.0` | 8.14 | 1 | 0 | -0.116 | 0.664 |
| `lambda=1.0,alpha=0.0` | 7.45 | 1 | 0 | -0.107 | 0.11 |
| `lambda=1.0,alpha=0.2` | 7.59 | 1 | 0 | -0.11 | 0.519 |
| `lambda=1.0,alpha=0.55` | 7.65 | 1 | 0 | -0.113 | 0.702 |
| `lambda=1.0,alpha=1.0` | 7.65 | 1 | 0 | -0.115 | 0.783 |
| `lambda=2.1,alpha=0.0` | 6.98 | 0 | 0 | -0.106 | 0.137 |
| `lambda=2.1,alpha=0.2` | 7.24 | 0 | 0 | -0.109 | 0.576 |
| `lambda=2.1,alpha=0.55` | 7.37 | 1 | 0 | -0.112 | 0.74 |
| `lambda=2.1,alpha=1.0` | 7.42 | 1 | 0 | -0.114 | 0.809 |
| `lambda=4.0,alpha=0.0` | 6.65 | 0 | 0 | -0.106 | 0.149 |
| `lambda=4.0,alpha=0.2` | 6.96 | 0 | 0 | -0.108 | 0.604 |
| `lambda=4.0,alpha=0.55` | 7.12 | 0 | 0 | -0.11 | 0.762 |
| `lambda=4.0,alpha=1.0` | 7.19 | 0 | 0 | -0.113 | 0.826 |
| `lambda=6.0,alpha=0.0` | 6.46 | 0 | 0 | -0.106 | 0.156 |
| `lambda=6.0,alpha=0.2` | 6.79 | 0 | 0 | -0.107 | 0.618 |
| `lambda=6.0,alpha=0.55` | 6.97 | 0 | 0 | -0.11 | 0.774 |
| `lambda=6.0,alpha=1.0` | 7.04 | 0 | 0 | -0.112 | 0.835 |
| `lambda=8.0,alpha=0.0` | 6.33 | 0 | 0 | -0.106 | 0.162 |
| `lambda=8.0,alpha=0.2` | 6.67 | 0 | 0 | -0.107 | 0.628 |
| `lambda=8.0,alpha=0.55` | 6.86 | 0 | 0 | -0.109 | 0.781 |
| `lambda=8.0,alpha=1.0` | 6.94 | 0 | 0 | -0.111 | 0.841 |

## E8 - is persister coverage the binding constraint?

| schedule | nadir | final burden | log10 final | cleared | relapsed | peak MRIC | min margin (2nd half) | OXPHOS tox | cum. M4 influx |
|---|---|---|---|---|---|---|---|---|---|
| `best_real_agents` | 2e+06 | 2.34e+07 | 7.37 | no | yes | 2.800 | -0.1116 | 0.0 | 2.7e+07 |
| `+persist_unmask_short` | 1.87e+06 | 2.24e+07 | 7.35 | no | yes | 2.810 | -0.1127 | 0.0 | 2.6e+07 |
| `+persist_unmask_full` | 1.84e+06 | 2.12e+07 | 7.33 | no | yes | 2.820 | -0.1134 | 0.0 | 2.48e+07 |
| `+persist_unmask_maintained` | 1.84e+06 | 7.14e+06 | 6.85 | no | no | 2.902 | -0.1134 | 0.0 | 2.16e+07 |

## E9 - horizon check on durability

| case | log10_final | relapsed | cleared | final_m4_frac | min_margin_post_tx |
|---|---|---|---|---|---|
| `best_real_agents@180d` | 7.37 | 1 | 0 | 0.74 | -0.112 |
| `+persist_maintained@180d` | 6.85 | 0 | 0 | 0.36 | -0.113 |
| `best_real_agents@360d` | 7.51 | 1 | 0 | 0.787 | -0.112 |
| `+persist_maintained@360d` | 6.85 | 0 | 0 | 0.358 | -0.113 |
| `best_real_agents@540d` | 7.53 | 1 | 0 | 0.794 | -0.112 |
| `+persist_maintained@540d` | 6.85 | 0 | 0 | 0.358 | -0.113 |
| `best_real_agents@1080d` | 7.53 | 1 | 0 | 0.795 | -0.112 |
| `+persist_maintained@1080d` | 6.85 | 0 | 0 | 0.358 | -0.113 |

