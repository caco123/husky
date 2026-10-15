import { test, expect } from '@playwright/test';


test.describe.serial('User Management', () => {

    test('Create User', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('button', { name: '+ Nuevo Usuario' })).toBeVisible();
        await page.getByRole('button', { name: '+ Nuevo Usuario' }).click();
        await expect(page.getByRole('dialog', { name: 'Crear Nuevo Usuario' })).toBeVisible();
        await page.getByRole('textbox', { name: 'Nombre de usuario (*):' }).click();
        await page.getByRole('textbox', { name: 'Nombre de usuario (*):' }).fill('finn.mertens');
        await page.getByRole('textbox', { name: 'Nombre de usuario (*):' }).press('Tab');
        await page.getByRole('textbox', { name: 'Nombre (*):' }).fill('Finn');
        await page.getByRole('textbox', { name: 'Nombre (*):' }).press('Tab');
        await page.getByRole('textbox', { name: 'Apellido (*):' }).fill('Mertens');
        await page.getByRole('textbox', { name: 'Apellido (*):' }).press('Tab');
        await page.getByRole('textbox', { name: 'Email (*):' }).fill('finn.mertens@adventuretime.com');
        await page.getByRole('textbox', { name: 'Email (*):' }).press('Tab');
        await page.getByRole('textbox', { name: 'Contraseña (*):' }).fill('FinnMerten');
        await page.getByRole('textbox', { name: 'Contraseña (*):' }).press('ControlOrMeta+a');
        await page.getByRole('textbox', { name: 'Contraseña (*):' }).fill('FinnMertens');
        await page.getByRole('textbox', { name: 'Contraseña (*):' }).press('Tab');
        await page.getByLabel('Rol:').selectOption('admin');


        await Promise.all([
            page.waitForResponse(response => response.url().includes('/users') && response.request().method() === 'POST'),
            page.getByRole('button', { name: 'Guardar Usuario' }).click(),
        ])

        await expect(page.getByRole('dialog', { name: 'Crear Nuevo Usuario' })).not.toBeVisible();
        await page.getByRole('textbox', { name: 'Buscar por nombre, usuario o' }).click();
        await page.getByRole('textbox', { name: 'Buscar por nombre, usuario o' }).fill('finn');
        await expect(page.getByRole('cell', { name: '@finn.mertens' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'finn.mertens@adventuretime.com' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'Finn Mertens' })).toBeVisible();
    });


    test('Update User', async ({ page }) => {
        await page.goto('/');

        await page.getByRole('textbox', { name: 'Buscar por nombre, usuario o' }).click();
        await page.getByRole('textbox', { name: 'Buscar por nombre, usuario o' }).fill('finn');
        await expect(page.getByRole('cell', { name: '@finn.mertens' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'finn.mertens@adventuretime.com' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
        await page.getByRole('button', { name: 'Editar' }).click();
        await expect(page.getByRole('dialog', { name: 'Editar Usuario' })).toBeVisible();
        await page.getByRole('textbox', { name: 'Apellido (*):' }).click();
        await page.getByRole('textbox', { name: 'Apellido (*):' }).fill('The Human');
        await page.getByLabel('Rol:').selectOption('moderator');

        await Promise.all([
            page.waitForResponse(response => response.url().includes('/users') && response.request().method() === 'PUT'),
            page.getByRole('button', { name: 'Guardar Cambios' }).click(),
        ])

        await expect(page.getByRole('cell', { name: 'Finn The Human' })).toBeVisible();
    });

    test('Delete User', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('textbox', { name: 'Buscar por nombre, usuario o' }).click();
        await page.getByRole('textbox', { name: 'Buscar por nombre, usuario o' }).fill('finn');
        await expect(page.getByRole('cell', { name: '@finn.mertens' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'finn.mertens@adventuretime.com' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'moderator' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Eliminar' })).toBeVisible();

        page.once('dialog', dialog => dialog.accept());

        await Promise.all([
            page.waitForResponse(response => response.url().includes('/users') && response.request().method() === 'DELETE'),
            page.getByRole('button', { name: 'Eliminar' }).click(),
        ])
    });

});