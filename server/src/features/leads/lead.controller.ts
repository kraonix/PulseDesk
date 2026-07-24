import { Request, Response, NextFunction } from 'express';
import * as leadService from './lead.service';
import { sendSuccess } from '../../lib/response';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await leadService.listLeads(req.query as any, req.user!);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const lead = await leadService.getLead(req.params.id, req.user!);
    sendSuccess(res, lead);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const lead = await leadService.createLead(req.body, req.user!);
    sendSuccess(res, lead, 201);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body, req.user!);
    sendSuccess(res, lead);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await leadService.deleteLead(req.params.id, req.user!);
    sendSuccess(res, null, 200, 'Lead deleted');
  } catch (err) {
    next(err);
  }
}

export async function addNote(req: Request, res: Response, next: NextFunction) {
  try {
    const note = await leadService.addNote(req.params.id, req.body, req.user!);
    sendSuccess(res, note, 201);
  } catch (err) {
    next(err);
  }
}
