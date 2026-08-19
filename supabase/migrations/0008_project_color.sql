-- Colore assegnato dallo staff a ogni cantiere, usato per distinguere a
-- colpo d'occhio i clienti nel Gantt multi-cantiere (staff/management-cantieri/gantt).
-- Il colore delle barre resta legato allo stato della lavorazione: questo
-- campo colora solo la colonna etichetta/cliente, non sovrascrive quel significato.

alter table public.projects
  add column color text not null default '#bda094';
