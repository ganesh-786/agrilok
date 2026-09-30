-- Reference data. Re-applied on every `agrilok-db migrate`, so it must stay
-- idempotent: every insert is an upsert.
--
-- Labels are taken from the wording the commissions' own syllabi use where one
-- exists ("सहायक स्तर चौथो तह", "अधिकृत स्तर सातौं तह"), not invented. Check a
-- label against a current official notice before changing it
-- (docs/exam-domain.md, "Verify before you encode").

insert into exam_levels (code, name_en, name_ne, post_en, post_ne, sort_order) values
    ('level_4', 'Level 4', 'चौथो तह', 'Assistant level (Junior Technical Assistant)', 'सहायक स्तर', 4),
    ('level_7', 'Level 7', 'सातौं तह', 'Officer level', 'अधिकृत स्तर', 7)
on conflict (code) do update set
    name_en = excluded.name_en,
    name_ne = excluded.name_ne,
    post_en = excluded.post_en,
    post_ne = excluded.post_ne,
    sort_order = excluded.sort_order;

insert into provinces (code, name_en, name_ne, sort_order) values
    ('federal',      'Federal',              'संघीय',          0),
    ('koshi',        'Koshi Province',        'कोशी प्रदेश',      1),
    ('madhesh',      'Madhesh Province',      'मधेश प्रदेश',      2),
    ('bagmati',      'Bagmati Province',      'बागमती प्रदेश',    3),
    ('gandaki',      'Gandaki Province',      'गण्डकी प्रदेश',    4),
    ('lumbini',      'Lumbini Province',      'लुम्बिनी प्रदेश',   5),
    ('karnali',      'Karnali Province',      'कर्णाली प्रदेश',   6),
    ('sudurpaschim', 'Sudurpaschim Province', 'सुदूरपश्चिम प्रदेश', 7)
on conflict (code) do update set
    name_en = excluded.name_en,
    name_ne = excluded.name_ne,
    sort_order = excluded.sort_order;

-- Groups as the syllabi name them. Plant Protection and Crop Protection are
-- both used by different commissions and are kept apart rather than merged on
-- a guess that they are the same group.
insert into service_groups (code, name_en, name_ne, sort_order) values
    ('agri_extension',                 'Agriculture Extension',                'कृषि प्रसार',               1),
    ('agronomy',                       'Agronomy',                             'बाली विज्ञान',              2),
    ('horticulture',                   'Horticulture',                         'बागवानी',                   3),
    ('plant_protection',               'Plant Protection',                     'वनस्पति संरक्षण',            4),
    ('crop_protection',                'Crop Protection',                      'बाली संरक्षण',              5),
    ('soil_science',                   'Soil Science',                         'माटो विज्ञान',              6),
    ('agri_economics_marketing',       'Agri Economics and Marketing',         'कृषि अर्थशास्त्र तथा बजार',     7),
    ('agriculture',                    'Agriculture (general)',                'कृषि (सामान्य)',              8),
    ('veterinary',                     'Veterinary',                           'भेटेरिनरी',                  9),
    ('livestock',                      'Livestock',                            'पशु विकास',                10),
    ('livestock_poultry_dairy',        'Livestock, Poultry and Dairy Development', 'पशुपन्छी तथा डेरी विकास',  11),
    ('fisheries',                      'Fisheries',                            'मत्स्य',                    12),
    ('food_nutrition_quality_control', 'Food, Nutrition and Quality Control',  'खाद्य, पोषण तथा गुण नियन्त्रण', 13)
on conflict (code) do update set
    name_en = excluded.name_en,
    name_ne = excluded.name_ne,
    sort_order = excluded.sort_order;

insert into doc_types (code, name_en, name_ne) values
    ('curriculum',         'Syllabus',             'पाठ्यक्रम'),
    ('statute',            'Act or Constitution',  'ऐन वा संविधान'),
    ('regulation',         'Regulation',           'नियमावली'),
    ('policy',             'Policy',               'नीति'),
    ('strategy',           'Strategy',             'रणनीति'),
    ('past_paper',         'Past paper',           'विगतका प्रश्नपत्र'),
    ('vacancy_notice',     'Vacancy notice',       'विज्ञापन'),
    ('result',             'Result',               'नतिजा'),
    ('variety_release',    'Variety release',      'जात उन्मोचन'),
    ('technical_bulletin', 'Technical bulletin',   'प्राविधिक बुलेटिन')
on conflict (code) do update set
    name_en = excluded.name_en,
    name_ne = excluded.name_ne;
